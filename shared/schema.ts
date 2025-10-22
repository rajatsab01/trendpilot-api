import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - stores user information and token balance
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().unique(),
  language: text("language").notNull().default("en"), // 'en' or 'hi'
  tokens: integer("tokens").notNull().default(10),
  createdAt: timestamp("created_at").defaultNow(),
});

// Analysis history - stores past market analyses
export const analyses = pgTable("analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  symbol: text("symbol").notNull(),
  duration: text("duration").notNull(), // 'long_term', 'short_term', 'scalping'
  recommendation: text("recommendation").notNull(), // 'BUY' or 'SELL'
  confidence: integer("confidence").notNull(), // 0-100
  sentiment: text("sentiment").notNull(), // 'Bullish' or 'Bearish'
  analysis: text("analysis").notNull(),
  rsi: text("rsi"),
  macd: text("macd"),
  stochastic: text("stochastic"),
  bollingerBands: text("bollinger_bands"),
  entry: text("entry"),
  takeProfit: text("take_profit"),
  stopLoss: text("stop_loss"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Brokers - stores broker integration details
export const brokers = pgTable("brokers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  apiKey: text("api_key"),
  webhookUrl: text("webhook_url"),
  isConnected: integer("is_connected").notNull().default(1), // 1 for true, 0 for false
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas with proper validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "Name is required"),
  mobile: z.string().min(10, "Valid mobile number required"),
  language: z.enum(["en", "hi"]),
  tokens: z.number().int().min(0).default(10),
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true,
}).extend({
  userId: z.string().min(1, "User ID is required"),
  symbol: z.string().min(1, "Symbol is required"),
  duration: z.enum(["long_term", "short_term", "scalping"]),
  recommendation: z.enum(["BUY", "SELL"]),
  confidence: z.number().int().min(0).max(100),
  sentiment: z.enum(["Bullish", "Bearish"]),
  analysis: z.string().min(1),
});

export const insertBrokerSchema = createInsertSchema(brokers).omit({
  id: true,
  createdAt: true,
  isConnected: true,
}).extend({
  userId: z.string().min(1, "User ID is required"),
  name: z.string().min(1, "Broker name is required"),
  apiKey: z.string().nullable().optional(),
  webhookUrl: z.string().url().nullable().optional(),
}).refine(
  (data) => data.apiKey || data.webhookUrl,
  { message: "Either API key or webhook URL is required" }
);

// Types derived from Drizzle tables
export type User = typeof users.$inferSelect;
export type Analysis = typeof analyses.$inferSelect;
export type Broker = typeof brokers.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type InsertBroker = z.infer<typeof insertBrokerSchema>;

// Trade duration options
export const tradeDurations = ["long_term", "short_term", "scalping"] as const;
export type TradeDuration = typeof tradeDurations[number];

// Language options
export const languages = ["en", "hi"] as const;
export type Language = typeof languages[number];
