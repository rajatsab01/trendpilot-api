import {
  type User,
  type InsertUser,
  type Analysis,
  type InsertAnalysis,
  type Broker,
  type InsertBroker,
  users,
  analyses,
  brokers,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, sql, gte, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByMobile(mobile: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTokens(id: string, tokens: number): Promise<User | undefined>;
  decrementUserTokens(id: string, amount: number): Promise<User | undefined>;
  updateUserMobile(id: string, mobile: string): Promise<User | undefined>;
  updateUserLanguage(id: string, language: string): Promise<User | undefined>;
  markInstallBonusClaimed(id: string): Promise<User | undefined>;

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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private analyses: Map<string, Analysis>;
  private brokers: Map<string, Broker>;

  constructor() {
    this.users = new Map();
    this.analyses = new Map();
    this.brokers = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByMobile(mobile: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.mobile === mobile);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      maxTokens: insertUser.maxTokens ?? 20,
      pwaInstallBonusClaimed: insertUser.pwaInstallBonusClaimed ?? 0,
      createdAt: new Date(),
    };
    this.users.set(id, user);
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
      correctedSymbol: insertAnalysis.correctedSymbol ?? null,
      assetName: insertAnalysis.assetName ?? null,
      instrumentName: insertAnalysis.instrumentName ?? null,
      currentPrice: insertAnalysis.currentPrice ?? null,
      livePrice: insertAnalysis.livePrice ?? null,
      candleClosePrice: insertAnalysis.candleClosePrice ?? null,
      priceSource: insertAnalysis.priceSource ?? null,
      candleCloseTime: insertAnalysis.candleCloseTime ?? null,
      timeframe: insertAnalysis.timeframe ?? null,
      nextCandleCloseTime: insertAnalysis.nextCandleCloseTime ?? null,
      marketSentiment: insertAnalysis.marketSentiment ?? null,
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
      tradeStatus: insertAnalysis.tradeStatus ?? "active",
      actualProfit: insertAnalysis.actualProfit ?? null,
      id,
      createdAt: new Date(),
    };
    this.analyses.set(id, analysis);
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
    return this.analyses.delete(id);
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
}

// PostgreSQL storage implementation
export class PgStorage implements IStorage {
  private db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByMobile(mobile: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.mobile, mobile));
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

  async markInstallBonusClaimed(id: string): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set({ pwaInstallBonusClaimed: 1 })
      .where(eq(users.id, id))
      .returning();
    return result[0];
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
}

// Use PostgreSQL storage in production, in-memory for development
export const storage = process.env.DATABASE_URL ? new PgStorage() : new MemStorage();
