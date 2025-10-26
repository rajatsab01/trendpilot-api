import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - stores user information and token balance
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().unique(),
  language: text("language").notNull().default("en"), // 'en', 'hi', 'es', 'zh', 'ar', 'fr', 'de', 'pt', 'ru', 'ja', 'ko', 'it'
  currency: text("currency").notNull().default("USD"), // Preferred currency for analysis and display
  exchange: text("exchange"), // Preferred exchange/country for symbol resolution (optional)
  tokens: integer("tokens").notNull().default(20),
  maxTokens: integer("max_tokens").notNull().default(20), // Tracks the highest token count ever owned
  pwaInstallBonusClaimed: integer("pwa_install_bonus_claimed").notNull().default(0), // 0 = not claimed, 1 = claimed
  createdAt: timestamp("created_at").defaultNow(),
});

// Analysis history - stores past market analyses
export const analyses = pgTable("analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  symbol: text("symbol").notNull(), // Original user-entered symbol (may contain misspellings)
  correctedSymbol: text("corrected_symbol"), // Perplexity-validated correct symbol
  assetName: text("asset_name"), // Perplexity-validated full asset name
  instrumentName: text("instrument_name"), // Full name of the instrument (for backward compatibility)
  currency: text("currency").notNull().default("USD"), // Currency used for this analysis (USD, INR, EUR, etc.)
  exchange: text("exchange"), // Exchange/country used for this analysis (optional)
  currentPrice: text("current_price"), // DEPRECATED: Use candleClosePrice instead
  livePrice: text("live_price"), // Actual current live market price (spot/ticker)
  candleClosePrice: text("candle_close_price"), // Price at closed candle used for analysis
  priceSource: text("price_source"), // Where Perplexity found the price (e.g., "CoinMarketCap", "Bloomberg")
  candleCloseTime: text("candle_close_time"), // Timestamp of candle close (e.g., "2025-10-25 13:00:00 UTC")
  timeframe: text("timeframe"), // Candle timeframe used for analysis (e.g., "15min", "1hr", "1day")
  nextCandleCloseTime: text("next_candle_close_time"), // When next candle closes for re-analysis (e.g., "2025-10-25 14:00:00 UTC")
  duration: text("duration").notNull(), // 'long_term', 'short_term', 'scalping'
  market: text("market").notNull(), // 'stock_equities', 'commodity', 'forex', 'derivatives_futures', 'bond', 'cryptocurrency'
  recommendation: text("recommendation").notNull(), // 'BUY' or 'SELL' - backend field name
  confidence: integer("confidence").notNull(), // 0-100
  sentiment: text("sentiment").notNull(), // 'Bullish' or 'Bearish'
  marketSentiment: text("market_sentiment"), // Market sentiment analysis
  deepAnalysis: text("deep_analysis"), // Deep technical analysis
  analysis: text("analysis").notNull(), // Final AI verdict
  rsi: text("rsi"),
  macd: text("macd"),
  stochastic: text("stochastic"),
  bollingerBands: text("bollinger_bands"),
  entry: text("entry"),
  takeProfit: text("take_profit"),
  stopLoss: text("stop_loss"),
  // Enhanced risk-reward analysis fields
  tp1: text("tp1"), // Take Profit 1
  tp2: text("tp2"), // Take Profit 2
  tp3: text("tp3"), // Take Profit 3
  r1: text("r1"), // Resistance 1
  r2: text("r2"), // Resistance 2
  r3: text("r3"), // Resistance 3
  s1: text("s1"), // Support 1
  s2: text("s2"), // Support 2
  s3: text("s3"), // Support 3
  trailingStopStrategy: text("trailing_stop_strategy"), // e.g., "Book 50% at TP1, trail remainder to TP2"
  probabilityScore: integer("probability_score"), // 0-100 confidence probability
  explanatoryNotes: text("explanatory_notes"), // Detailed notes and disclaimers from Perplexity
  // Saved analyses tracking
  isSaved: integer("is_saved").notNull().default(0), // 0 = not saved, 1 = saved by user
  tradeStatus: text("trade_status").default("active"), // 'won', 'lost', 'active', 'expired'
  actualProfit: text("actual_profit"), // Calculated profit/loss percentage (e.g., "+2.5%" or "-1.8%")
  createdAt: timestamp("created_at").defaultNow(),
});

// Brokers - stores broker integration details
export const brokers = pgTable("brokers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  apiKey: text("api_key"),
  webhookUrl: text("webhook_url"),
  webhookMessage: text("webhook_message"), // JSON template with placeholders like {{ticker}}, {{strategy.order.action}}
  strategyId: text("strategy_id"), // Broker-provided strategy ID for webhook execution
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
  language: z.enum(["en", "hi", "es", "zh", "de", "fr", "ar", "pt", "ru", "ja", "ko", "it"]),
  tokens: z.number().int().min(0).default(20),
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true,
}).extend({
  userId: z.string().min(1, "User ID is required"),
  symbol: z.string().min(1, "Symbol is required"),
  duration: z.enum(["long_term", "short_term", "scalping"]),
  market: z.enum(["stock_equities", "commodity", "forex", "derivatives_futures", "bond", "cryptocurrency"]),
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
  webhookMessage: z.string().nullable().optional(),
  strategyId: z.string().nullable().optional(),
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

// Language options - 12 languages supported
export const languages = ["en", "hi", "es", "zh", "de", "fr", "ar", "pt", "ru", "ja", "ko", "it"] as const;
export type Language = typeof languages[number];

// App version - increment this when releasing new versions
// Format: MAJOR.MINOR.PATCH (e.g., "1.0.0")
export const APP_VERSION = "1.0.0";
