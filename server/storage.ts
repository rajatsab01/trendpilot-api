import {
  type User,
  type InsertUser,
  type Analysis,
  type InsertAnalysis,
  type Broker,
  type InsertBroker,
  type Follow,
  type InsertFollow,
  type Block,
  type InsertBlock,
  type Notification,
  type InsertNotification,
  type Message,
  type InsertMessage,
  type Report,
  type InsertReport,
  type Reaction,
  type InsertReaction,
  type PinnedTrader,
  type InsertPinnedTrader,
  users,
  analyses,
  brokers,
  follows,
  blocks,
  notifications,
  messages,
  reports,
  reactions,
  pinnedTraders,
} from "../shared/schema";

import { randomUUID } from "crypto";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, sql, gte, and, desc } from "drizzle-orm";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

// ---------------------------------------------------------
// Interface Definition
// ---------------------------------------------------------
export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByMobile(mobile: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTokens(id: string, tokens: number): Promise<User | undefined>;
  decrementUserTokens(id: string, amount: number): Promise<User | undefined>;
  updateUserMobile(id: string, mobile: string): Promise<User | undefined>;
  updateUserLanguage(id: string, language: string): Promise<User | undefined>;
  updateUserPreferences(id: string, updates: { currency?: string; language?: string; exchange?: string }): Promise<User | undefined>;
  markInstallBonusClaimed(id: string): Promise<User | undefined>;
  updateAlias(id: string, alias: string): Promise<User | undefined>;
  acceptCommunityRules(id: string): Promise<User | undefined>;
  updateLastSeen(id: string): Promise<User | undefined>;
  banUser(id: string): Promise<User | undefined>;
  unbanUser(id: string): Promise<User | undefined>;
  searchUsersByAlias(query: string): Promise<User[]>;

  // Analyses
  getAnalysis(id: string): Promise<Analysis | undefined>;
  getAnalysesByUser(userId: string): Promise<Analysis[]>;
  getSavedAnalysesByUser(userId: string): Promise<Analysis[]>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  toggleSaveAnalysis(id: string): Promise<Analysis | undefined>;
  updateAnalysisStatus(id: string, status: string, profit: string | null): Promise<Analysis | undefined>;
  deleteAnalysis(id: string): Promise<boolean>;

  // Brokers
  getBroker(id: string): Promise<Broker | undefined>;
  getBrokersByUser(userId: string): Promise<Broker[]>;
  createBroker(broker: InsertBroker): Promise<Broker>;
  updateBroker(id: string, updates: Partial<Broker>): Promise<Broker | undefined>;
  deleteBroker(id: string): Promise<boolean>;

  // Community
  followUser(followerId: string, followingId: string): Promise<Follow>;
  unfollowUser(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<User[]>;
  getFollowing(userId: string): Promise<User[]>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;

  blockUser(blockerId: string, blockedId: string): Promise<Block>;
  unblockUser(blockerId: string, blockedId: string): Promise<boolean>;
  getBlockedUsers(userId: string): Promise<User[]>;
  isBlocked(blockerId: string, blockedId: string): Promise<boolean>;

  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  getUnreadNotificationCount(userId: string): Promise<number>;

  sendMessage(message: InsertMessage): Promise<Message>;
  getConversation(userId1: string, userId2: string): Promise<Message[]>;
  getRecentConversations(userId: string): Promise<Array<Message & { otherUser: User }>>;
  markMessageAsRead(id: string): Promise<Message | undefined>;
  getUnreadMessageCount(userId: string): Promise<number>;

  publishAnalysis(id: string): Promise<Analysis | undefined>;
  unpublishAnalysis(id: string): Promise<Analysis | undefined>;
  getPublishedAnalysesFeed(userId: string): Promise<Array<Analysis & { author: User }>>;

  createReport(report: InsertReport): Promise<Report>;
  getReports(userId?: string): Promise<Report[]>;
  updateReportStatus(id: string, status: string): Promise<Report | undefined>;

  addReaction(reaction: InsertReaction): Promise<Reaction>;
  removeReaction(userId: string, analysisId: string, reactionType: string): Promise<boolean>;
  getUserReaction(userId: string, analysisId: string): Promise<Reaction | undefined>;
  getReactionCounts(analysisId: string): Promise<{ like: number; heart: number; dislike: number }>;
  getAnalysisReactions(analysisId: string): Promise<Reaction[]>;

  pinTrader(userId: string, pinnedUserId: string): Promise<PinnedTrader>;
  unpinTrader(userId: string, pinnedUserId: string): Promise<boolean>;
  reorderPinnedTrader(userId: string, pinnedUserId: string, newOrder: number): Promise<PinnedTrader | undefined>;
  getPinnedTraders(userId: string): Promise<Array<PinnedTrader & { pinnedUser: User }>>;
  isPinned(userId: string, pinnedUserId: string): Promise<boolean>;
  getPinnedTradersWithNotifications(userId: string): Promise<Array<{ user: User; unreadCount: number }>>;
  markTraderNotificationsRead(userId: string, traderId: string): Promise<void>;
}

// ---------------------------------------------------------
// Utility: Find Recent Analysis (Static Helper)
// ---------------------------------------------------------
export async function findRecentAnalysis(
  db: NeonHttpDatabase,
  userId: string,
  symbol: string,
  duration: string,
  market: string,
  language?: string
) {
  const result = await db
    .select()
    .from(analyses)
    .where(
      and(
        eq(analyses.userId, userId),
        eq(analyses.symbol, symbol),
        eq(analyses.duration, duration),
        eq(analyses.market, market),
        language ? eq(analyses.language, language) : sql`TRUE`
      )
    )
    .orderBy(sql`${analyses.createdAt} DESC`)
    .limit(1);
  return result[0];
}

/** Dev-only file path so MemStorage survives process restarts (same userId + saved analyses). */
const MEM_STORAGE_FILE = path.join(process.cwd(), "data", "mem-storage.json");

function memStorageJsonReviver(_key: string, value: unknown): unknown {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return value;
}

type MemStorageSnapshotV1 = {
  version: 1;
  users: [string, User][];
  analyses: [string, Analysis][];
  brokers: [string, Broker][];
  follows: [string, Follow][];
  blocks: [string, Block][];
  notifications: [string, Notification][];
  messages: [string, Message][];
  reports: [string, Report][];
  reactions: [string, Reaction][];
  pinnedTraders: [string, PinnedTrader][];
};

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private analyses: Map<string, Analysis>;
  private brokers: Map<string, Broker>;
  private follows: Map<string, Follow>;
  private blocks: Map<string, Block>;
  private notifications: Map<string, Notification>;
  private messages: Map<string, Message>;
  private reports: Map<string, Report>;
  private reactions: Map<string, Reaction>;
  private pinnedTraders: Map<string, PinnedTrader>;
  private devPersistTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.users = new Map();
    this.analyses = new Map();
    this.brokers = new Map();
    this.follows = new Map();
    this.blocks = new Map();
    this.notifications = new Map();
    this.messages = new Map();
    this.reports = new Map();
    this.reactions = new Map();
    this.pinnedTraders = new Map();
    this.loadDevSnapshot();
    this.devPersistTimer = setInterval(() => this.persistDevSnapshot(), 2000);
    this.devPersistTimer.unref?.();
    const flush = () => {
      try {
        this.persistDevSnapshot();
      } catch {
        /* ignore */
      }
    };
    process.once("SIGINT", flush);
    process.once("SIGTERM", flush);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByMobile(mobile: string): Promise<User | undefined> {
    const digits = mobile.replace(/\D/g, "");
    if (!digits) return undefined;
    return Array.from(this.users.values()).find(
      (user) => (user.mobile || "").replace(/\D/g, "") === digits
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      exchange: insertUser.exchange ?? null,
      currency: insertUser.currency ?? "USD",
      maxTokens: insertUser.maxTokens ?? 20,
      pwaInstallBonusClaimed: insertUser.pwaInstallBonusClaimed ?? 0,
      isAdmin: insertUser.isAdmin ?? 0,
      alias: insertUser.alias ?? null,
      rulesAccepted: insertUser.rulesAccepted ?? 0,
      lastSeen: insertUser.lastSeen ?? null,
      isBanned: insertUser.isBanned ?? 0,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    this.persistDevSnapshot();
    return user;
  }

  async updateUserTokens(id: string, tokens: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    // Update maxTokens if new token count is higher
    const maxTokens = Math.max(user.maxTokens, tokens);
    const updatedUser = { ...user, tokens, maxTokens };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async decrementUserTokens(id: string, amount: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    // Check if user has enough tokens
    if (user.tokens < amount) return undefined;

    // Don't change maxTokens when decrementing (only when adding)
    const updatedUser = { ...user, tokens: user.tokens - amount };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserMobile(id: string, mobile: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, mobile };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserLanguage(id: string, language: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, language };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserPreferences(id: string, updates: { currency?: string; language?: string; exchange?: string }): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async markInstallBonusClaimed(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, pwaInstallBonusClaimed: 1 };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Analyses
  async getAnalysis(id: string): Promise<Analysis | undefined> {
    return this.analyses.get(id);
  }

  async getAnalysesByUser(userId: string): Promise<Analysis[]> {
    return Array.from(this.analyses.values()).filter(
      (analysis) => analysis.userId === userId
    );
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const id = randomUUID();
    const analysis: Analysis = {
      ...insertAnalysis,
      language: insertAnalysis.language ?? "en",
      correctedSymbol: insertAnalysis.correctedSymbol ?? null,
      assetName: insertAnalysis.assetName ?? null,
      instrumentName: insertAnalysis.instrumentName ?? null,
      currency: insertAnalysis.currency ?? "USD",
      exchange: insertAnalysis.exchange ?? null,
      currentPrice: insertAnalysis.currentPrice ?? null,
      livePrice: insertAnalysis.livePrice ?? null,
      candleClosePrice: insertAnalysis.candleClosePrice ?? null,
      priceSource: insertAnalysis.priceSource ?? null,
      candleCloseTime: insertAnalysis.candleCloseTime ?? null,
      timeframe: insertAnalysis.timeframe ?? null,
      nextCandleCloseTime: insertAnalysis.nextCandleCloseTime ?? null,
      marketSentiment: insertAnalysis.marketSentiment ?? null,
      newsHighlights: insertAnalysis.newsHighlights ?? null,
      deepAnalysis: insertAnalysis.deepAnalysis ?? null,
      rsi: insertAnalysis.rsi ?? null,
      macd: insertAnalysis.macd ?? null,
      stochastic: insertAnalysis.stochastic ?? null,
      bollingerBands: insertAnalysis.bollingerBands ?? null,
      entry: insertAnalysis.entry ?? null,
      takeProfit: insertAnalysis.takeProfit ?? null,
      stopLoss: insertAnalysis.stopLoss ?? null,
      tp1: insertAnalysis.tp1 ?? null,
      tp2: insertAnalysis.tp2 ?? null,
      tp3: insertAnalysis.tp3 ?? null,
      r1: insertAnalysis.r1 ?? null,
      r2: insertAnalysis.r2 ?? null,
      r3: insertAnalysis.r3 ?? null,
      s1: insertAnalysis.s1 ?? null,
      s2: insertAnalysis.s2 ?? null,
      s3: insertAnalysis.s3 ?? null,
      trailingStopStrategy: insertAnalysis.trailingStopStrategy ?? null,
      probabilityScore: insertAnalysis.probabilityScore ?? null,
      explanatoryNotes: insertAnalysis.explanatoryNotes ?? null,
      isSaved: insertAnalysis.isSaved ?? 0,
      isPublished: insertAnalysis.isPublished ?? 0,
      tradeStatus: insertAnalysis.tradeStatus ?? "active",
      actualProfit: insertAnalysis.actualProfit ?? null,
      sourceCurrency: insertAnalysis.sourceCurrency ?? null,
      exchangeRate: insertAnalysis.exchangeRate ?? null,
      id,
      createdAt: new Date(),
    };
    this.analyses.set(id, analysis);
    this.persistDevSnapshot();
    return analysis;
  }

  async getSavedAnalysesByUser(userId: string): Promise<Analysis[]> {
    return Array.from(this.analyses.values()).filter(
      (analysis) => analysis.userId === userId && analysis.isSaved === 1
    );
  }

  async toggleSaveAnalysis(id: string): Promise<Analysis | undefined> {
    const analysis = this.analyses.get(id);
    if (!analysis) return undefined;

    const updatedAnalysis = { ...analysis, isSaved: analysis.isSaved === 1 ? 0 : 1 };
    this.analyses.set(id, updatedAnalysis);
    this.persistDevSnapshot();
    return updatedAnalysis;
  }

  async updateAnalysisStatus(id: string, status: string, profit: string | null): Promise<Analysis | undefined> {
    const analysis = this.analyses.get(id);
    if (!analysis) return undefined;

    const updatedAnalysis = { ...analysis, tradeStatus: status, actualProfit: profit };
    this.analyses.set(id, updatedAnalysis);
    return updatedAnalysis;
  }

  async deleteAnalysis(id: string): Promise<boolean> {
    const ok = this.analyses.delete(id);
    if (ok) this.persistDevSnapshot();
    return ok;
  }

  // Brokers
  async getBroker(id: string): Promise<Broker | undefined> {
    return this.brokers.get(id);
  }

  async getBrokersByUser(userId: string): Promise<Broker[]> {
    return Array.from(this.brokers.values()).filter(
      (broker) => broker.userId === userId
    );
  }

  async createBroker(insertBroker: InsertBroker): Promise<Broker> {
    const id = randomUUID();
    const broker: Broker = {
      ...insertBroker,
      apiKey: insertBroker.apiKey ?? null,
      webhookUrl: insertBroker.webhookUrl ?? null,
      webhookMessage: insertBroker.webhookMessage ?? null,
      strategyId: insertBroker.strategyId ?? null,
      id,
      isConnected: 1,
      createdAt: new Date(),
    };
    this.brokers.set(id, broker);
    return broker;
  }

  async updateBroker(
    id: string,
    updates: Partial<Broker>
  ): Promise<Broker | undefined> {
    const broker = this.brokers.get(id);
    if (!broker) return undefined;

    const updatedBroker = { ...broker, ...updates };
    this.brokers.set(id, updatedBroker);
    return updatedBroker;
  }

  async deleteBroker(id: string): Promise<boolean> {
    return this.brokers.delete(id);
  }

  // Community user methods - Not implemented in MemStorage (PostgreSQL only)
  async updateAlias(id: string, alias: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, alias };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async acceptCommunityRules(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, rulesAccepted: 1 };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateLastSeen(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, lastSeen: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async banUser(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, isBanned: 1 };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async unbanUser(id: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, isBanned: 0 };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async searchUsersByAlias(query: string): Promise<User[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.users.values()).filter(
      (u) => u.alias?.toLowerCase().includes(lowerQuery)
    );
  }

  // Community methods - Not implemented in MemStorage (PostgreSQL only)
  async followUser(followerId: string, followingId: string): Promise<Follow> {
    const id = randomUUID();
    const follow: Follow = { id, followerId, followingId, createdAt: new Date() };
    this.follows.set(id, follow);
    return follow;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const follow = Array.from(this.follows.values()).find(
      (f) => f.followerId === followerId && f.followingId === followingId
    );
    if (follow) {
      return this.follows.delete(follow.id);
    }
    return false;
  }

  async getFollowers(userId: string): Promise<User[]> {
    const followerIds = Array.from(this.follows.values())
      .filter((f) => f.followingId === userId)
      .map((f) => f.followerId);
    return followerIds
      .map((id) => this.users.get(id))
      .filter((u): u is User => !!u);
  }

  async getFollowing(userId: string): Promise<User[]> {
    const followingIds = Array.from(this.follows.values())
      .filter((f) => f.followerId === userId)
      .map((f) => f.followingId);
    return followingIds
      .map((id) => this.users.get(id))
      .filter((u): u is User => !!u);
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    return Array.from(this.follows.values()).some(
      (f) => f.followerId === followerId && f.followingId === followingId
    );
  }

  async blockUser(blockerId: string, blockedId: string): Promise<Block> {
    const id = randomUUID();
    const block: Block = { id, blockerId, blockedId, createdAt: new Date() };
    this.blocks.set(id, block);
    return block;
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const block = Array.from(this.blocks.values()).find(
      (b) => b.blockerId === blockerId && b.blockedId === blockedId
    );
    if (block) {
      return this.blocks.delete(block.id);
    }
    return false;
  }

  async getBlockedUsers(userId: string): Promise<User[]> {
    const blockedIds = Array.from(this.blocks.values())
      .filter((b) => b.blockerId === userId)
      .map((b) => b.blockedId);
    return blockedIds
      .map((id) => this.users.get(id))
      .filter((u): u is User => !!u);
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    return Array.from(this.blocks.values()).some(
      (b) => b.blockerId === blockerId && b.blockedId === blockedId
    );
  }

  async createNotification(n: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      ...n,
      id,
      isRead: 0,
       // analysisId is already optional in InsertNotification and Notification
      analysisId: n.analysisId ?? null,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    const updated = { ...notification, isRead: 1 };
    this.notifications.set(id, updated);
    return updated;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return Array.from(this.notifications.values()).filter(
      (n) => n.userId === userId && n.isRead === 0
    ).length;
  }

  async sendMessage(m: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...m,
      id,
      isRead: 0,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async getConversation(userId1: string, userId2: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(
        (m) =>
          (m.senderId === userId1 && m.receiverId === userId2) ||
          (m.senderId === userId2 && m.receiverId === userId1)
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getRecentConversations(userId: string): Promise<Array<Message & { otherUser: User }>> {
    const userMessages = Array.from(this.messages.values()).filter(
      (m) => m.senderId === userId || m.receiverId === userId
    );

    const conversationsMap = new Map<string, Message>();
    for (const m of userMessages) {
      const otherId = m.senderId === userId ? m.receiverId : m.senderId;
      const existing = conversationsMap.get(otherId);
      if (!existing || m.createdAt.getTime() > existing.createdAt.getTime()) {
        conversationsMap.set(otherId, m);
      }
    }

    return Array.from(conversationsMap.entries())
      .map(([otherId, m]) => ({
        ...m,
        otherUser: this.users.get(otherId)!,
      }))
      .filter((c) => !!c.otherUser)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markMessageAsRead(id: string): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    const updated = { ...message, isRead: 1 };
    this.messages.set(id, updated);
    return updated;
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    return Array.from(this.messages.values()).filter(
      (m) => m.receiverId === userId && m.isRead === 0
    ).length;
  }

  async publishAnalysis(id: string): Promise<Analysis | undefined> {
    const analysis = this.analyses.get(id);
    if (!analysis) return undefined;
    const updated = { ...analysis, isPublished: 1 };
    this.analyses.set(id, updated);
    return updated;
  }

  async unpublishAnalysis(id: string): Promise<Analysis | undefined> {
    const analysis = this.analyses.get(id);
    if (!analysis) return undefined;
    const updated = { ...analysis, isPublished: 0 };
    this.analyses.set(id, updated);
    return updated;
  }

  async getPublishedAnalysesFeed(userId: string): Promise<Array<Analysis & { author: User }>> {
    const published = Array.from(this.analyses.values())
      .filter((a) => a.isPublished === 1)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

    return published.map((a) => ({
      ...a,
      author: this.users.get(a.userId)!,
    })).filter(item => !!item.author);
  }

  async createReport(report: InsertReport): Promise<Report> {
    const id = randomUUID();
    const newReport: Report = {
      ...report,
      id,
      status: "pending",
      createdAt: new Date(),
    };
    this.reports.set(id, newReport);
    return newReport;
  }

  async getReports(userId?: string): Promise<Report[]> {
    return Array.from(this.reports.values()).filter(
      (r) => !userId || r.userId === userId
    );
  }

  async updateReportStatus(id: string, status: string): Promise<Report | undefined> {
    const report = this.reports.get(id);
    if (!report) return undefined;
    const updated = { ...report, status };
    this.reports.set(id, updated);
    return updated;
  }

  async addReaction(insertReaction: InsertReaction): Promise<Reaction> {
    const existing = await this.getUserReaction(insertReaction.userId, insertReaction.analysisId);
    if (existing) {
      if (existing.reactionType === insertReaction.reactionType) {
        return existing;
      }
      const updated: Reaction = {
        ...existing,
        reactionType: insertReaction.reactionType,
      };
      this.reactions.set(existing.id, updated);
      return updated;
    }
    const id = randomUUID();
    const newReaction: Reaction = { ...insertReaction, id, createdAt: new Date() };
    this.reactions.set(id, newReaction);
    return newReaction;
  }

  async removeReaction(userId: string, analysisId: string, reactionType: string): Promise<boolean> {
    const reaction = Array.from(this.reactions.values()).find(
      (r) => r.userId === userId && r.analysisId === analysisId && r.reactionType === reactionType
    );
    if (reaction) {
      return this.reactions.delete(reaction.id);
    }
    return false;
  }

  async getUserReaction(userId: string, analysisId: string): Promise<Reaction | undefined> {
    const list = Array.from(this.reactions.values()).filter(
      (r) => r.userId === userId && r.analysisId === analysisId
    );
    if (list.length === 0) return undefined;
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }

  async getReactionCounts(analysisId: string): Promise<{ like: number; heart: number; dislike: number }> {
    const reactionsList = Array.from(this.reactions.values()).filter(
      (r) => r.analysisId === analysisId
    ) as Reaction[];
    const counts = { like: 0, heart: 0, dislike: 0 };
    for (const r of reactionsList) {
      if (r.reactionType === 'like') counts.like++;
      else if (r.reactionType === 'heart') counts.heart++;
      else if (r.reactionType === 'dislike') counts.dislike++;
    }
    return counts;
  }

  async getAnalysisReactions(analysisId: string): Promise<Reaction[]> {
    return Array.from(this.reactions.values()).filter(
      (r) => r.analysisId === analysisId
    );
  }

  async pinTrader(userId: string, pinnedUserId: string): Promise<PinnedTrader> {
    const id = randomUUID();
    const pinned: PinnedTrader = { id, userId, pinnedUserId, pinnedOrder: 0, createdAt: new Date() };
    this.pinnedTraders.set(id, pinned);
    return pinned;
  }

  async unpinTrader(userId: string, pinnedUserId: string): Promise<boolean> {
    const pinned = Array.from(this.pinnedTraders.values()).find(
      (p) => p.userId === userId && p.pinnedUserId === pinnedUserId
    );
    if (pinned) {
      return this.pinnedTraders.delete(pinned.id);
    }
    return false;
  }

  async reorderPinnedTrader(userId: string, pinnedUserId: string, newOrder: number): Promise<PinnedTrader | undefined> {
    const pinned = Array.from(this.pinnedTraders.values()).find(
      (p) => p.userId === userId && p.pinnedUserId === pinnedUserId
    );
    if (!pinned) return undefined;
    const updated = { ...pinned, pinnedOrder: newOrder };
    this.pinnedTraders.set(pinned.id, updated);
    return updated;
  }

  async getPinnedTraders(userId: string): Promise<Array<PinnedTrader & { pinnedUser: User }>> {
    return Array.from(this.pinnedTraders.values())
      .filter((p) => p.userId === userId)
      .map((p) => ({
        ...p,
        pinnedUser: this.users.get(p.pinnedUserId)!,
      }))
      .filter((p) => !!p.pinnedUser)
      .sort((a, b) => a.pinnedOrder - b.pinnedOrder);
  }

  async isPinned(userId: string, pinnedUserId: string): Promise<boolean> {
    return Array.from(this.pinnedTraders.values()).some(
      (p) => p.userId === userId && p.pinnedUserId === pinnedUserId
    );
  }

  async getPinnedTradersWithNotifications(userId: string): Promise<Array<{ user: User; unreadCount: number }>> {
    // In MemStorage, we'll just return the pinned users with unread message counts
    const pinned = await this.getPinnedTraders(userId);
    const results = [];
    for (const p of pinned) {
      const unreadCount = await this.getUnreadMessageCountFromUser(userId, p.pinnedUserId);
      results.push({ user: p.pinnedUser, unreadCount });
    }
    return results;
  }

  // Private helper for MemStorage
  private async getUnreadMessageCountFromUser(receiverId: string, senderId: string): Promise<number> {
    return Array.from(this.messages.values()).filter(
      (m) => m.receiverId === receiverId && m.senderId === senderId && m.isRead === 0
    ).length;
  }

  async markTraderNotificationsRead(userId: string, traderId: string): Promise<void> {
    for (const [id, n] of this.notifications) {
      if (
        n.userId === userId &&
        n.actorId === traderId &&
        n.type === "new_analysis" &&
        n.isRead === 0
      ) {
        this.notifications.set(id, { ...n, isRead: 1 });
      }
    }
  }

  private loadDevSnapshot(): void {
    try {
      if (!existsSync(MEM_STORAGE_FILE)) return;
      const raw = readFileSync(MEM_STORAGE_FILE, "utf-8");
      const data = JSON.parse(raw, memStorageJsonReviver) as MemStorageSnapshotV1;
      if (data.version !== 1 || !Array.isArray(data.users)) return;
      this.users = new Map(data.users);
      this.analyses = new Map(data.analyses ?? []);
      this.brokers = new Map(data.brokers ?? []);
      this.follows = new Map(data.follows ?? []);
      this.blocks = new Map(data.blocks ?? []);
      this.notifications = new Map(data.notifications ?? []);
      this.messages = new Map(data.messages ?? []);
      this.reports = new Map(data.reports ?? []);
      this.reactions = new Map(data.reactions ?? []);
      this.pinnedTraders = new Map(data.pinnedTraders ?? []);
      console.log(
        `📁 Dev memory restored: ${this.users.size} users, ${this.analyses.size} analyses → ${MEM_STORAGE_FILE}`,
      );
    } catch (e) {
      console.warn("⚠️ Could not load dev memory snapshot:", e);
    }
  }

  private persistDevSnapshot(): void {
    try {
      const dir = path.dirname(MEM_STORAGE_FILE);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const payload: MemStorageSnapshotV1 = {
        version: 1,
        users: Array.from(this.users.entries()),
        analyses: Array.from(this.analyses.entries()),
        brokers: Array.from(this.brokers.entries()),
        follows: Array.from(this.follows.entries()),
        blocks: Array.from(this.blocks.entries()),
        notifications: Array.from(this.notifications.entries()),
        messages: Array.from(this.messages.entries()),
        reports: Array.from(this.reports.entries()),
        reactions: Array.from(this.reactions.entries()),
        pinnedTraders: Array.from(this.pinnedTraders.entries()),
      };
      writeFileSync(MEM_STORAGE_FILE, JSON.stringify(payload), "utf-8");
    } catch (e) {
      console.warn("⚠️ Could not persist dev memory snapshot:", e);
    }
  }
}

export class PgStorage implements IStorage {
  private db: NeonHttpDatabase;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const sqlClient = neon(process.env.DATABASE_URL);
    this.db = drizzle(sqlClient);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByMobile(mobile: string): Promise<User | undefined> {
    const digits = mobile.replace(/\D/g, "");
    if (!digits) return undefined;
    const result = await this.db
      .select()
      .from(users)
      .where(sql`regexp_replace(${users.mobile}, '[^0-9]', '', 'g') = ${digits}`)
      .limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserTokens(id: string, tokens: number): Promise<User | undefined> {
    // Update maxTokens if new token count is higher using GREATEST SQL function
    const result = await this.db
      .update(users)
      .set({ 
        tokens,
        maxTokens: sql`GREATEST(${users.maxTokens}, ${tokens})`
      })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async decrementUserTokens(id: string, amount: number): Promise<User | undefined> {
    // Atomic decrement with balance check - only succeeds if user has enough tokens
    // Don't update maxTokens when decrementing (only when adding tokens)
    const result = await this.db
      .update(users)
      .set({ tokens: sql`${users.tokens} - ${amount}` })
      .where(and(eq(users.id, id), gte(users.tokens, amount)))
      .returning();
    return result[0]; // Returns undefined if no rows updated (insufficient balance)
  }

  async updateUserMobile(id: string, mobile: string): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set({ mobile })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserLanguage(id: string, language: string): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set({ language })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserPreferences(id: string, updates: { currency?: string; language?: string; exchange?: string }): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async markInstallBonusClaimed(id: string): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set({ pwaInstallBonusClaimed: 1 })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateAlias(id: string, alias: string): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set({ alias })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async acceptCommunityRules(id: string): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set({ rulesAccepted: 1 })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateLastSeen(id: string): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set({ lastSeen: sql`NOW()` })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async banUser(id: string): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set({ isBanned: 1 })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async unbanUser(id: string): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set({ isBanned: 0 })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async searchUsersByAlias(query: string): Promise<User[]> {
    const result = await this.db
      .select()
      .from(users)
      .where(sql`${users.alias} ILIKE ${`%${query}%`}`)
      .limit(20);
    return result;
  }

  // Analyses
  async getAnalysis(id: string): Promise<Analysis | undefined> {
    const result = await this.db.select().from(analyses).where(eq(analyses.id, id));
    return result[0];
  }

  async getAnalysesByUser(userId: string): Promise<Analysis[]> {
    return await this.db.select().from(analyses).where(eq(analyses.userId, userId));
  }

  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const result = await this.db.insert(analyses).values(insertAnalysis).returning();
    return result[0];
  }

  async getSavedAnalysesByUser(userId: string): Promise<Analysis[]> {
    return await this.db
      .select()
      .from(analyses)
      .where(and(eq(analyses.userId, userId), eq(analyses.isSaved, 1)));
  }

  async toggleSaveAnalysis(id: string): Promise<Analysis | undefined> {
    const result = await this.db
      .update(analyses)
      .set({ isSaved: sql`CASE WHEN ${analyses.isSaved} = 1 THEN 0 ELSE 1 END` })
      .where(eq(analyses.id, id))
      .returning();
    return result[0];
  }

  async updateAnalysisStatus(id: string, status: string, profit: string | null): Promise<Analysis | undefined> {
    const result = await this.db
      .update(analyses)
      .set({ tradeStatus: status, actualProfit: profit })
      .where(eq(analyses.id, id))
      .returning();
    return result[0];
  }

  async deleteAnalysis(id: string): Promise<boolean> {
    const result = await this.db.delete(analyses).where(eq(analyses.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Brokers
  async getBroker(id: string): Promise<Broker | undefined> {
    const result = await this.db.select().from(brokers).where(eq(brokers.id, id));
    return result[0];
  }

  async getBrokersByUser(userId: string): Promise<Broker[]> {
    return await this.db.select().from(brokers).where(eq(brokers.userId, userId));
  }

  async createBroker(insertBroker: InsertBroker): Promise<Broker> {
    const result = await this.db
      .insert(brokers)
      .values({ ...insertBroker, isConnected: 1 })
      .returning();
    return result[0];
  }

  async updateBroker(
    id: string,
    updates: Partial<Broker>
  ): Promise<Broker | undefined> {
    const result = await this.db
      .update(brokers)
      .set(updates)
      .where(eq(brokers.id, id))
      .returning();
    return result[0];
  }

  async deleteBroker(id: string): Promise<boolean> {
    const result = await this.db.delete(brokers).where(eq(brokers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Community - Follows
  async followUser(followerId: string, followingId: string): Promise<Follow> {
    const result = await this.db
      .insert(follows)
      .values({ followerId, followingId })
      .returning();
    return result[0];
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const result = await this.db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getFollowers(userId: string): Promise<User[]> {
    // Get users who follow this user
    const result = await this.db
      .select({
        id: users.id,
        name: users.name,
        mobile: users.mobile,
        language: users.language,
        currency: users.currency,
        exchange: users.exchange,
        tokens: users.tokens,
        maxTokens: users.maxTokens,
        pwaInstallBonusClaimed: users.pwaInstallBonusClaimed,
        isAdmin: users.isAdmin,
        alias: users.alias,
        rulesAccepted: users.rulesAccepted,
        lastSeen: users.lastSeen,
        isBanned: users.isBanned,
        createdAt: users.createdAt,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));
    return result;
  }

  async getFollowing(userId: string): Promise<User[]> {
    // Get users this user follows
    const result = await this.db
      .select({
        id: users.id,
        name: users.name,
        mobile: users.mobile,
        language: users.language,
        currency: users.currency,
        exchange: users.exchange,
        tokens: users.tokens,
        maxTokens: users.maxTokens,
        pwaInstallBonusClaimed: users.pwaInstallBonusClaimed,
        isAdmin: users.isAdmin,
        alias: users.alias,
        rulesAccepted: users.rulesAccepted,
        lastSeen: users.lastSeen,
        isBanned: users.isBanned,
        createdAt: users.createdAt,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));
    return result;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    return result.length > 0;
  }

  // Community - Blocks
  async blockUser(blockerId: string, blockedId: string): Promise<Block> {
    const result = await this.db
      .insert(blocks)
      .values({ blockerId, blockedId })
      .returning();
    return result[0];
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await this.db
      .delete(blocks)
      .where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getBlockedUsers(userId: string): Promise<User[]> {
    const result = await this.db
      .select({
        id: users.id,
        name: users.name,
        mobile: users.mobile,
        language: users.language,
        currency: users.currency,
        exchange: users.exchange,
        tokens: users.tokens,
        maxTokens: users.maxTokens,
        pwaInstallBonusClaimed: users.pwaInstallBonusClaimed,
        isAdmin: users.isAdmin,
        alias: users.alias,
        rulesAccepted: users.rulesAccepted,
        lastSeen: users.lastSeen,
        isBanned: users.isBanned,
        createdAt: users.createdAt,
      })
      .from(blocks)
      .innerJoin(users, eq(blocks.blockedId, users.id))
      .where(eq(blocks.blockerId, userId));
    return result;
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(blocks)
      .where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)));
    return result.length > 0;
  }

  // Community - Notifications
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const result = await this.db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    return result[0];
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(sql`${notifications.createdAt} DESC`);
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const result = await this.db
      .update(notifications)
      .set({ isRead: 1 })
      .where(eq(notifications.id, id))
      .returning();
    return result[0];
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
    return result[0]?.count || 0;
  }

  // Community - Messages
  async sendMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await this.db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return result[0];
  }

  async getConversation(userId1: string, userId2: string): Promise<Message[]> {
    return await this.db
      .select()
      .from(messages)
      .where(
        sql`(${messages.senderId} = ${userId1} AND ${messages.receiverId} = ${userId2}) 
            OR (${messages.senderId} = ${userId2} AND ${messages.receiverId} = ${userId1})`
      )
      .orderBy(sql`${messages.createdAt} ASC`);
  }

  async getRecentConversations(userId: string): Promise<Array<Message & { otherUser: User }>> {
    // Get the most recent message from each conversation
    const result = await this.db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        content: messages.content,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        otherUser: {
          id: users.id,
          name: users.name,
          mobile: users.mobile,
          language: users.language,
          currency: users.currency,
          exchange: users.exchange,
          tokens: users.tokens,
          maxTokens: users.maxTokens,
          pwaInstallBonusClaimed: users.pwaInstallBonusClaimed,
          isAdmin: users.isAdmin,
          alias: users.alias,
          rulesAccepted: users.rulesAccepted,
          lastSeen: users.lastSeen,
          isBanned: users.isBanned,
          createdAt: users.createdAt,
        },
      })
      .from(messages)
      .innerJoin(
        users,
        sql`${users.id} = CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END`
      )
      .where(sql`${messages.senderId} = ${userId} OR ${messages.receiverId} = ${userId}`)
      .orderBy(sql`${messages.createdAt} DESC`)
      .limit(20);
    return result as Array<Message & { otherUser: User }>;
  }

  async markMessageAsRead(id: string): Promise<Message | undefined> {
    const result = await this.db
      .update(messages)
      .set({ isRead: 1 })
      .where(eq(messages.id, id))
      .returning();
    return result[0];
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(eq(messages.receiverId, userId), eq(messages.isRead, 0)));
    return result[0]?.count || 0;
  }

  // Community - Published Analyses
  async publishAnalysis(id: string): Promise<Analysis | undefined> {
    const result = await this.db
      .update(analyses)
      .set({ isPublished: 1 })
      .where(eq(analyses.id, id))
      .returning();
    return result[0];
  }

  async unpublishAnalysis(id: string): Promise<Analysis | undefined> {
    const result = await this.db
      .update(analyses)
      .set({ isPublished: 0 })
      .where(eq(analyses.id, id))
      .returning();
    return result[0];
  }

  async getPublishedAnalysesFeed(userId: string): Promise<Array<Analysis & { author: User }>> {
    // Get ALL published analyses (public feed)
    // Exclude analyses from blocked users only
    const result = await this.db
      .select({
        // Analysis fields
        id: analyses.id,
        userId: analyses.userId,
        symbol: analyses.symbol,
        correctedSymbol: analyses.correctedSymbol,
        assetName: analyses.assetName,
        instrumentName: analyses.instrumentName,
        currency: analyses.currency,
        exchange: analyses.exchange,
        currentPrice: analyses.currentPrice,
        livePrice: analyses.livePrice,
        candleClosePrice: analyses.candleClosePrice,
        priceSource: analyses.priceSource,
        candleCloseTime: analyses.candleCloseTime,
        timeframe: analyses.timeframe,
        nextCandleCloseTime: analyses.nextCandleCloseTime,
        duration: analyses.duration,
        market: analyses.market,
        recommendation: analyses.recommendation,
        confidence: analyses.confidence,
        sentiment: analyses.sentiment,
        marketSentiment: analyses.marketSentiment,
        newsHighlights: analyses.newsHighlights,
        deepAnalysis: analyses.deepAnalysis,
        analysis: analyses.analysis,
        rsi: analyses.rsi,
        macd: analyses.macd,
        stochastic: analyses.stochastic,
        bollingerBands: analyses.bollingerBands,
        entry: analyses.entry,
        takeProfit: analyses.takeProfit,
        stopLoss: analyses.stopLoss,
        tp1: analyses.tp1,
        tp2: analyses.tp2,
        tp3: analyses.tp3,
        r1: analyses.r1,
        r2: analyses.r2,
        r3: analyses.r3,
        s1: analyses.s1,
        s2: analyses.s2,
        s3: analyses.s3,
        trailingStopStrategy: analyses.trailingStopStrategy,
        probabilityScore: analyses.probabilityScore,
        explanatoryNotes: analyses.explanatoryNotes,
        isSaved: analyses.isSaved,
        isPublished: analyses.isPublished,
        tradeStatus: analyses.tradeStatus,
        actualProfit: analyses.actualProfit,
        createdAt: analyses.createdAt,
        // Author fields
        author: {
          id: users.id,
          name: users.name,
          mobile: users.mobile,
          language: users.language,
          currency: users.currency,
          exchange: users.exchange,
          tokens: users.tokens,
          maxTokens: users.maxTokens,
          pwaInstallBonusClaimed: users.pwaInstallBonusClaimed,
          isAdmin: users.isAdmin,
          alias: users.alias,
          rulesAccepted: users.rulesAccepted,
          createdAt: users.createdAt,
        },
      })
      .from(analyses)
      .innerJoin(users, eq(analyses.userId, users.id))
      .where(
        and(
          eq(analyses.isPublished, 1), // Analysis is published
          // Exclude blocked users - subquery to check if blocked
          sql`NOT EXISTS (
            SELECT 1 FROM ${blocks}
            WHERE ${blocks.blockerId} = ${userId}
            AND ${blocks.blockedId} = ${analyses.userId}
          )`
        )
      )
      .orderBy(sql`${analyses.createdAt} DESC`)
      .limit(50); // Limit to 50 most recent

    return result as Array<Analysis & { author: User }>;
  }

  // Admin Reports
  async createReport(insertReport: InsertReport): Promise<Report> {
    const result = await this.db
      .insert(reports)
      .values(insertReport)
      .returning();
    return result[0];
  }

  async getReports(userId?: string): Promise<Report[]> {
    if (userId) {
      // Get user's own reports
      return await this.db
        .select()
        .from(reports)
        .where(eq(reports.userId, userId))
        .orderBy(sql`${reports.createdAt} DESC`);
    } else {
      // Admin gets all reports
      return await this.db
        .select()
        .from(reports)
        .orderBy(sql`${reports.createdAt} DESC`);
    }
  }

  async updateReportStatus(id: string, status: string): Promise<Report | undefined> {
    const result = await this.db
      .update(reports)
      .set({ status })
      .where(eq(reports.id, id))
      .returning();
    return result[0];
  }

  // Community - Reactions
  async addReaction(insertReaction: InsertReaction): Promise<Reaction> {
    // First, check if user already reacted with this type - if so, just return existing
    const existing = await this.getUserReaction(insertReaction.userId, insertReaction.analysisId);
    
    if (existing) {
      // If same reaction type, just return existing
      if (existing.reactionType === insertReaction.reactionType) {
        return existing;
      }
      // If different reaction type, update it
      const result = await this.db
        .update(reactions)
        .set({ reactionType: insertReaction.reactionType })
        .where(eq(reactions.id, existing.id))
        .returning();
      return result[0];
    }

    // Insert new reaction
    const result = await this.db
      .insert(reactions)
      .values(insertReaction)
      .returning();
    return result[0];
  }

  async removeReaction(userId: string, analysisId: string, reactionType: string): Promise<boolean> {
    const result = await this.db
      .delete(reactions)
      .where(
        and(
          eq(reactions.userId, userId),
          eq(reactions.analysisId, analysisId),
          eq(reactions.reactionType, reactionType)
        )
      )
      .returning();
    return result.length > 0;
  }

  async getUserReaction(userId: string, analysisId: string): Promise<Reaction | undefined> {
    const result = await this.db
      .select()
      .from(reactions)
      .where(
        and(
          eq(reactions.userId, userId),
          eq(reactions.analysisId, analysisId)
        )
      )
      .orderBy(desc(reactions.createdAt))
      .limit(1);
    return result[0];
  }

  async getReactionCounts(analysisId: string): Promise<{ like: number; heart: number; dislike: number }> {
    const result = await this.db
      .select()
      .from(reactions)
      .where(eq(reactions.analysisId, analysisId))
      .orderBy(desc(reactions.createdAt));

    const byUser = new Map<string, Reaction>();
    for (const r of result) {
      if (!byUser.has(r.userId)) byUser.set(r.userId, r);
    }

    const counts = {
      like: 0,
      heart: 0,
      dislike: 0,
    };
    for (const r of byUser.values()) {
      if (r.reactionType === "like") counts.like++;
      else if (r.reactionType === "heart") counts.heart++;
      else if (r.reactionType === "dislike") counts.dislike++;
    }

    return counts;
  }

  async getAnalysisReactions(analysisId: string): Promise<Reaction[]> {
    return await this.db
      .select()
      .from(reactions)
      .where(eq(reactions.analysisId, analysisId))
      .orderBy(sql`${reactions.createdAt} DESC`);
  }

  // Community - Pinned Traders
  async pinTrader(userId: string, pinnedUserId: string): Promise<PinnedTrader> {
    // Check if already pinned
    const existing = await this.isPinned(userId, pinnedUserId);
    if (existing) {
      // Return existing pinned trader
      const result = await this.db
        .select()
        .from(pinnedTraders)
        .where(
          and(
            eq(pinnedTraders.userId, userId),
            eq(pinnedTraders.pinnedUserId, pinnedUserId)
          )
        );
      return result[0];
    }

    // Get current max order for this user
    const currentPinned = await this.db
      .select()
      .from(pinnedTraders)
      .where(eq(pinnedTraders.userId, userId))
      .orderBy(sql`${pinnedTraders.pinnedOrder} DESC`);
    
    const nextOrder = currentPinned.length > 0 ? currentPinned[0].pinnedOrder + 1 : 0;

    // Insert new pinned trader
    const result = await this.db
      .insert(pinnedTraders)
      .values({
        userId,
        pinnedUserId,
        pinnedOrder: nextOrder,
      })
      .returning();
    return result[0];
  }

  async unpinTrader(userId: string, pinnedUserId: string): Promise<boolean> {
    const result = await this.db
      .delete(pinnedTraders)
      .where(
        and(
          eq(pinnedTraders.userId, userId),
          eq(pinnedTraders.pinnedUserId, pinnedUserId)
        )
      )
      .returning();
    
    // Reorder remaining pinned traders
    if (result.length > 0) {
      const remaining = await this.db
        .select()
        .from(pinnedTraders)
        .where(eq(pinnedTraders.userId, userId))
        .orderBy(sql`${pinnedTraders.pinnedOrder} ASC`);
      
      // Update orders to be sequential
      for (let i = 0; i < remaining.length; i++) {
        await this.db
          .update(pinnedTraders)
          .set({ pinnedOrder: i })
          .where(eq(pinnedTraders.id, remaining[i].id));
      }
    }

    return result.length > 0;
  }

  async reorderPinnedTrader(userId: string, pinnedUserId: string, newOrder: number): Promise<PinnedTrader | undefined> {
    const pinned = await this.db
      .select()
      .from(pinnedTraders)
      .where(
        and(
          eq(pinnedTraders.userId, userId),
          eq(pinnedTraders.pinnedUserId, pinnedUserId)
        )
      );
    
    if (pinned.length === 0) return undefined;

    const result = await this.db
      .update(pinnedTraders)
      .set({ pinnedOrder: newOrder })
      .where(eq(pinnedTraders.id, pinned[0].id))
      .returning();
    
    return result[0];
  }

  async getPinnedTraders(userId: string): Promise<Array<PinnedTrader & { pinnedUser: User }>> {
    const result = await this.db
      .select({
        id: pinnedTraders.id,
        userId: pinnedTraders.userId,
        pinnedUserId: pinnedTraders.pinnedUserId,
        pinnedOrder: pinnedTraders.pinnedOrder,
        createdAt: pinnedTraders.createdAt,
        pinnedUser: {
          id: users.id,
          name: users.name,
          mobile: users.mobile,
          language: users.language,
          currency: users.currency,
          exchange: users.exchange,
          tokens: users.tokens,
          maxTokens: users.maxTokens,
          pwaInstallBonusClaimed: users.pwaInstallBonusClaimed,
          isAdmin: users.isAdmin,
          alias: users.alias,
          rulesAccepted: users.rulesAccepted,
          lastSeen: users.lastSeen,
          isBanned: users.isBanned,
          createdAt: users.createdAt,
        },
      })
      .from(pinnedTraders)
      .innerJoin(users, eq(pinnedTraders.pinnedUserId, users.id))
      .where(eq(pinnedTraders.userId, userId))
      .orderBy(sql`${pinnedTraders.pinnedOrder} ASC`);

    return result as Array<PinnedTrader & { pinnedUser: User }>;
  }

  async isPinned(userId: string, pinnedUserId: string): Promise<boolean> {
    const result = await this.db
      .select()
      .from(pinnedTraders)
      .where(
        and(
          eq(pinnedTraders.userId, userId),
          eq(pinnedTraders.pinnedUserId, pinnedUserId)
        )
      );
    return result.length > 0;
  }

  async getPinnedTradersWithNotifications(userId: string): Promise<Array<{ user: User; unreadCount: number }>> {
    // Get pinned traders
    const pinned = await this.getPinnedTraders(userId);
    
    // For each pinned trader, count unread "new_analysis" notifications
    const result = await Promise.all(
      pinned.map(async (p) => {
        const unreadNotifications = await this.db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, userId),
              eq(notifications.actorId, p.pinnedUserId),
              eq(notifications.type, 'new_analysis'),
              eq(notifications.isRead, 0)
            )
          );
        
        return {
          user: p.pinnedUser,
          unreadCount: unreadNotifications.length,
        };
      })
    );
    
    return result;
  }

  async markTraderNotificationsRead(userId: string, traderId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ isRead: 1 })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.actorId, traderId),
          eq(notifications.type, 'new_analysis'),
          eq(notifications.isRead, 0)
        )
      );
  }
}

// Use PostgreSQL storage in production, in-memory for development
export const storage = process.env.DATABASE_URL ? new PgStorage() : new MemStorage();

if (!process.env.DATABASE_URL) {
  console.log(
    "📌 DATABASE_URL not set — dev mode uses data/mem-storage.json so accounts and saved analyses survive server restarts. Use DATABASE_URL (e.g. Neon) in production.",
  );
}
