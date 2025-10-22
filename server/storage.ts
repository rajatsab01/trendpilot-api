import {
  type User,
  type InsertUser,
  type Analysis,
  type InsertAnalysis,
  type Broker,
  type InsertBroker,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByMobile(mobile: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTokens(id: string, tokens: number): Promise<User | undefined>;

  // Analyses
  getAnalysis(id: string): Promise<Analysis | undefined>;
  getAnalysesByUser(userId: string): Promise<Analysis[]>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;

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
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserTokens(id: string, tokens: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, tokens };
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
      id,
      createdAt: new Date(),
    };
    this.analyses.set(id, analysis);
    return analysis;
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

export const storage = new MemStorage();
