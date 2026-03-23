import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import Razorpay from "razorpay";
import crypto from "crypto";

import { storage } from "./storage";
import { analyzeMarketWithPerplexity } from "./perplexity";
import { searchCryptoSymbols } from "./marketData";
import { fetchMarketPrice } from "./priceData";
import { validateSymbol } from "./symbolValidator";
import { findRecentAnalysis } from "./storage";
import { initializeSymbolRegistry, symbolRegistry } from "./symbolRegistry";
import { validateContent, validateUsername } from "./profanityFilter";
import { searchInstruments, getPopularInstruments } from "./instrumentSearch";
import { askPerplexity } from "./pplx";
import { maybeRelocalizeStoredAnalysis } from "./relocalizeOfflineAnalysis";

import { insertBrokerSchema, insertReactionSchema, insertReportSchema, APP_VERSION } from "../shared/schema";

// -------------------------------
// ✅ Strong language typing (fixes TS2322)
// -------------------------------
const SUPPORTED_LANGS = [
  "en",
  "hi",
  "es",
  "zh",
  "de",
  "fr",
  "ar",
  "pt",
  "ru",
  "ja",
  "ko",
  "it",
] as const;

type AppLang = (typeof SUPPORTED_LANGS)[number];

function toAppLang(raw: unknown, fallback: AppLang = "en"): AppLang {
  const s = String(raw || "").trim().toLowerCase();
  // Accept-Language can be "en-US,en;q=0.9"
  const primary = s.split(",")[0]?.trim() || "";
  const code = primary.split("-")[0]?.trim() || "";
  return (SUPPORTED_LANGS as readonly string[]).includes(code) ? (code as AppLang) : fallback;
}

/**
 * Helper: determine request language.
 * Looks at x-app-lang, x-lang or Accept-Language.
 */
function getReqLang(req: Request): AppLang {
  return toAppLang(req.headers["x-app-lang"] || req.headers["x-lang"] || req.headers["accept-language"], "en");
}

// -------------------------------
// 🔒 SECURITY: Token cap during testing
// -------------------------------
const TEST_MODE_ACTIVE = (process.env.TEST_MODE ?? "true").toLowerCase() === "true";
const TEST_MODE_TOKEN_CAP = 20; // Maximum tokens allowed during testing

function checkTokenCap(currentTokens: number, tokensToAdd: number) {
  if (!TEST_MODE_ACTIVE) return { allowed: true, tokensToAdd: tokensToAdd };

  const newBalance = currentTokens + tokensToAdd;
  if (newBalance > TEST_MODE_TOKEN_CAP) {
    if (currentTokens >= TEST_MODE_TOKEN_CAP) {
      return {
        allowed: false,
        error: `Maximum ${TEST_MODE_TOKEN_CAP} tokens allowed. Please use some tokens before adding more.`,
        maxTokens: TEST_MODE_TOKEN_CAP,
        tokensToAdd: 0,
      };
    }
    // Cap addition to precisely hit TEST_MODE_TOKEN_CAP
    return {
      allowed: true,
      tokensToAdd: TEST_MODE_TOKEN_CAP - currentTokens,
    };
  }

  return { allowed: true, tokensToAdd };
}

// -------------------------------
// 🔒 VERSION GUARD MIDDLEWARE - FAIL-CLOSED
// -------------------------------
function versionGuardMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientVersion = req.headers["x-app-version"];

  if (!clientVersion) {
    console.log(`⚠️ [VERSION GUARD] Blocked request - no version header sent`);
    return res.status(426).json({
      error: "App update required",
      message: "You're using an outdated version. Please refresh the app to continue.",
      currentVersion: APP_VERSION,
      updateRequired: true,
    });
  }

  if (clientVersion !== APP_VERSION) {
    console.log(
      `⚠️ [VERSION GUARD] Blocked request - version mismatch (client: ${clientVersion}, server: ${APP_VERSION})`
    );
    return res.status(426).json({
      error: "App update required",
      message: "You're using an outdated version. Please refresh the app to continue.",
      clientVersion,
      currentVersion: APP_VERSION,
      updateRequired: true,
    });
  }

  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  initializeSymbolRegistry();

  // ---------------------------------------------
  // ✅ Phone verification
  // ---------------------------------------------
  app.post("/api/auth/verify-phone", async (req: Request, res: Response) => {
    try {
      const { userJsonUrl } = req.body as { userJsonUrl?: string };
      if (!userJsonUrl) return res.status(400).json({ error: "User JSON URL required" });

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(userJsonUrl);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "user.phone.email") {
        return res.status(400).json({ error: "Invalid verification URL" });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(userJsonUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) return res.status(400).json({ error: "Failed to verify phone number" });

      const data = await response.json();
      const { user_country_code, user_phone_number } = data || {};

      if (!user_country_code || !user_phone_number) {
        return res.status(400).json({ error: "Invalid phone data" });
      }

      const phoneNumber = `+${user_country_code}${user_phone_number}`;
      res.json({ phoneNumber, countryCode: user_country_code, verified: true });
    } catch (error: any) {
      console.error("Phone verification error:", error);
      if (error.name === 'AbortError') {
        return res.status(408).json({ error: "Request timed out" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---------------------------------------------
  // ✅ Auth/Login
  // ---------------------------------------------
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const loginSchema = z.object({
        name: z.string().min(1),
        mobile: z.string().min(10),
        language: z.enum(SUPPORTED_LANGS).default("en"),
      });

      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const { name, mobile, language } = validationResult.data;

      const normalizedMobile = mobile.replace(/[\s-]/g, "");
      const mobileDigits = normalizedMobile.replace(/\D/g, "");
      if (mobileDigits.length < 10) {
        return res.status(400).json({ error: "Invalid phone number" });
      }
      const canonicalMobile = `+${mobileDigits}`;

      // Lookup matches by digits only so +91…, 91…, and spacing variants resolve the same account
      let user = await storage.getUserByMobile(normalizedMobile);

      if (!user) {
        user = await storage.createUser({
          name,
          mobile: canonicalMobile,
          language,
          tokens: 20, // Give new users 20 tokens instead of 0
          maxTokens: 20, // Highest-ever cap for UI (DB column defaults to 0 if omitted)
        } as any);

        return res.json({ userId: user.id, tokens: user.tokens });
      }

      if (user.mobile !== canonicalMobile) {
        const updated = await storage.updateUserMobile(user.id, canonicalMobile);
        if (updated) user = updated;
      }

      if (user.language !== language) {
        await storage.updateUserLanguage(user.id, language);
        user.language = language;
      }

      // Only gift tokens if user has exactly 0 (initial state or completely used up)
      if (user.tokens === 0) {
        console.log(`🎁 Gifting 20 tokens to user ${user.id} (balance was 0)`);
        user = await storage.updateUserTokens(user.id, 20) || user;
      }

      res.json({ userId: user.id, tokens: user.tokens });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---------------------------------------------
  // ✅ User
  // ---------------------------------------------
  app.get("/api/user/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      let user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/user/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const updateSchema = z.object({
        currency: z.string().optional(),
        language: z.enum(SUPPORTED_LANGS).optional(),
        exchange: z.string().optional(),
      });

      const validationResult = updateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const updates = validationResult.data;
      const updatedUser = await storage.updateUserPreferences(userId, updates as any);
      if (!updatedUser) return res.status(404).json({ error: "User not found" });

      res.json(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---------------------------------------------
  // ✅ Dev helpers (SAFE TYPES: no extra schema fields)
  // ⚠️ Only available in non-production environments
  // ---------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    app.post("/api/dev/ensure-user", async (req: Request, res: Response) => {
      try {
        const id = (req.body as any)?.id?.toString() || "dev-user";
        let user = await storage.getUser(id);

        if (!user) {
          await storage.createUser({
            name: `Dev User (${id})`,
            mobile: "9999999999",
            language: "en",
            tokens: 20, // Give dev users 20 tokens instead of 0
          } as any);

          console.log(`✅ Created test user "${id}"`);
          user = await storage.getUser(id);
        }

        if (!user) return res.status(500).json({ error: "Failed to create or retrieve user" });
        res.json({ ok: true, id: user.id, tokens: user.tokens });
      } catch (e: any) {
        console.error("ensure-user error:", e);
        res.status(500).json({ error: e.message || "ensure-user failed" });
      }
    });

    app.get("/api/dev/user/:id", async (req: Request, res: Response) => {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    });
  } // end dev-only block

  // ---------------------------------------------
  // ✅ Razorpay plural route aliases
  // ---------------------------------------------
  app.post("/api/payments/create-order", (req: Request, _res: Response, next: NextFunction) => {
    req.url = "/api/payment/create-order";
    next();
  });

  app.post("/api/payments/verify", (req: Request, _res: Response, next: NextFunction) => {
    req.url = "/api/payment/verify";
    next();
  });

  // ---------------------------------------------
  // ✅ Razorpay: Create order
  // ---------------------------------------------
  app.post("/api/payment/create-order", async (req: Request, res: Response) => {
    try {
      const { userId, tokenPackage } = req.body as { userId?: string; tokenPackage?: string };

      if (!userId || !tokenPackage) {
        return res.status(400).json({ error: "User ID and token package required" });
      }

      const packages: Record<string, { tokens: number; amount: number }> = {
        small: { tokens: 10, amount: 9900 },
        medium: { tokens: 100, amount: 89900 },
        large: { tokens: 500, amount: 399900 },
      };

      const selectedPackage = packages[tokenPackage];
      if (!selectedPackage) return res.status(400).json({ error: "Invalid token package" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.log("Razorpay not configured, using demo mode");
        return res.json({
          orderId: `demo_order_${Date.now()}`,
          amount: selectedPackage.amount,
          currency: "INR",
          keyId: "demo_key",
          demoMode: true,
          tokens: selectedPackage.tokens,
        });
      }

      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const shortUserId = userId.split("-")[0];
      const timestamp = Date.now().toString().slice(-8);
      const receipt = `rcpt_${shortUserId}_${timestamp}`;

      const order = await razorpay.orders.create({
        amount: selectedPackage.amount,
        currency: "INR",
        receipt,
        notes: { userId, tokens: selectedPackage.tokens },
      });

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        demoMode: false,
        tokens: selectedPackage.tokens,
      });
    } catch (error: any) {
      console.error("Create order error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // ---------------------------------------------
  // ✅ Razorpay: Verify payment and add tokens
  // ---------------------------------------------
  app.post("/api/payment/verify", async (req: Request, res: Response) => {
    try {
      const { userId, orderId, paymentId, signature, tokens, demoMode } = req.body as any;

      if (!userId || !tokens) return res.status(400).json({ error: "User ID and tokens required" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (demoMode) {
        const capCheck = checkTokenCap(user.tokens, tokens);
        if (!capCheck.allowed) {
          return res.status(400).json({
            error: capCheck.error,
            tokenCapReached: true,
            currentTokens: user.tokens,
            maxTokens: capCheck.maxTokens,
          });
        }

        await storage.updateUserTokens(userId, user.tokens + capCheck.tokensToAdd);
        return res.json({ success: true, newBalance: user.tokens + capCheck.tokensToAdd, message: "Demo payment successful" });
      }

      if (!paymentId || !signature || !orderId) {
        return res.status(400).json({ error: "orderId, paymentId and signature required" });
      }

      const body = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest("hex");

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: "Invalid payment signature" });
      }

      const capCheck = checkTokenCap(user.tokens, tokens);
      if (!capCheck.allowed) {
        return res.status(400).json({
          error: capCheck.error,
          tokenCapReached: true,
          currentTokens: user.tokens,
          maxTokens: capCheck.maxTokens,
        });
      }

      await storage.updateUserTokens(userId, user.tokens + capCheck.tokensToAdd);
      res.json({ success: true, newBalance: user.tokens + capCheck.tokensToAdd, message: "Payment successful" });
    } catch (error: any) {
      console.error("Verify payment error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // ---------------------------------------------
  // ✅ Charity donation (kept as-is)
  // ---------------------------------------------
  app.post("/api/charity/create-order", async (req: Request, res: Response) => {
    try {
      const { userId, amount } = req.body as any;

      if (!userId || !amount || amount < 10) {
        return res.status(400).json({ error: "Invalid donation amount. Minimum ₹10 required." });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      });

      const shortUserId = userId.split("-")[0];
      const timestamp = Date.now().toString().slice(-8);
      const receipt = `char_${shortUserId}_${timestamp}`;

      const order = await razorpay.orders.create({
        amount: amount * 100,
        currency: "INR",
        receipt,
        notes: { userId, type: "charity", amount },
      });

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (error: any) {
      console.error("Create charity order error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/charity/verify", async (req: Request, res: Response) => {
    try {
      const { userId, orderId, paymentId, signature, amount } = req.body as any;

      if (!userId || !amount) return res.status(400).json({ error: "User ID and amount required" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (!paymentId || !signature || !orderId) {
        return res.status(400).json({ error: "orderId, paymentId and signature required" });
      }

      const body = `${orderId}|${paymentId}`;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest("hex");

      if (expectedSignature !== signature) return res.status(400).json({ error: "Invalid payment signature" });

      console.log(`Charity donation verified: User ${userId} donated ₹${amount}`);
      res.json({ success: true, message: "Thank you for your generous donation!" });
    } catch (error: any) {
      console.error("Verify charity payment error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // ---------------------------------------------
  // ✅ Symbol search / instruments
  // ---------------------------------------------
  app.get("/api/symbols/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.query;
      const market = req.query.market;

      if (!query || typeof query !== "string") return res.status(400).json({ error: "Query parameter required" });
      if (!market || typeof market !== "string") return res.status(400).json({ error: "Market parameter required" });

      if (market === "cryptocurrency") {
        const suggestions = await searchCryptoSymbols(query);
        return res.json({ suggestions });
      }

      res.json({ suggestions: [] });
    } catch (error: any) {
      console.error("Symbol search error:", error);
      res.status(500).json({ error: "Failed to search symbols" });
    }
  });

  app.get("/api/search-instruments", async (req: Request, res: Response) => {
    try {
      const q = typeof req.query.query === "string" ? req.query.query.trim() : "";
      const mkt = typeof req.query.market === "string" ? req.query.market.toLowerCase().trim() : undefined;

      const augment = (list: any[]) =>
        list.map((s) => {
          const reg = symbolRegistry.get(s.symbol);
          return {
            ...s,
            classification: reg?.classification ?? undefined,
            label: `${s.symbol} — ${s.name}`,
            value: s.symbol,
          };
        });

      if (!q || q.length < 2) {
        const popular = getPopularInstruments(mkt);
        return res.json({ suggestions: augment(popular) });
      }

      const all = searchInstruments(q);
      const filtered = mkt ? all.filter((x) => x.market === mkt) : all;

      return res.json({ suggestions: augment(filtered) });
    } catch (error) {
      console.error("Instrument search error:", error);
      return res.status(500).json({ error: "Failed to search instruments", suggestions: [] });
    }
  });

  app.post("/api/symbols/validate", async (req: Request, res: Response) => {
    try {
      const validateSchema = z.object({
        symbol: z.string().min(1),
        market: z.enum(["stock", "commodity", "forex", "cryptocurrency"]),
      });

      const validationResult = validateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const { symbol, market } = validationResult.data;
      const result = await validateSymbol(symbol, market);
      res.json(result);
    } catch (error: any) {
      console.error("Symbol validation error:", error);
      res.status(500).json({ error: "Failed to validate symbol" });
    }
  });

  // ---------------------------------------------
  // ✅ ANALYZE (ONLY ONE ROUTE) - protected by version guard
  // ---------------------------------------------
  app.post("/api/analyze", versionGuardMiddleware, async (req: Request, res: Response) => {
    try {
      const analyzeSchema = z.object({
        userId: z.string().min(1),
        symbol: z.string().min(1),
        duration: z.enum(["scalping", "swing", "short_term", "long_term"]),
        market: z.enum(["stock", "commodity", "forex", "cryptocurrency"]),
        currency: z.string().optional().default("USD"),
        exchange: z.string().optional(),
        language: z.string().optional(),
      });

      const validation = analyzeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { userId, symbol, duration, market, currency, exchange } = validation.data;

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.tokens < 2) return res.status(400).json({ error: "Insufficient tokens" });

      const headerLang = getReqLang(req);
      const bodyLang = toAppLang(validation.data.language, headerLang);
      const finalLang: AppLang = toAppLang(user.language, bodyLang);

      if (user.language !== finalLang) {
        await storage.updateUserLanguage(user.id, finalLang);
      }

      // Fetch OHLCV candle data for the symbol
      let priceData: any;
      try {
        priceData = await fetchMarketPrice(symbol, duration, market);
      } catch (err: any) {
        console.error(`❌ [PRE-FLIGHT] fetchMarketPrice failed:`, err.message);
        return res.status(400).json({
          error: `Unable to fetch price data for symbol "${symbol}".`,
          hint: "Please verify the symbol or try using autocomplete.",
        });
      }

      /* 
      // Check for recent cached analysis to avoid duplicate charges
      if (process.env.DATABASE_URL) {
        try {
          const { drizzle } = await import("drizzle-orm/neon-http");
          const { neon } = await import("@neondatabase/serverless");
          const sqlClient = neon(process.env.DATABASE_URL);
          const db = drizzle(sqlClient);
          const existing = await findRecentAnalysis(db, userId, symbol, duration, market, finalLang);
          if (existing) {
            console.log(`♻️ Using cached analysis for ${symbol} (${finalLang}) — no token deduction`);
            return res.json(existing);
          }
        } catch (cacheErr) {
          console.warn("Cache lookup failed, proceeding with fresh analysis:", cacheErr);
        }
      }
      */

      const analysisResult = await analyzeMarketWithPerplexity(
        symbol,
        duration,
        market,
        finalLang,
        priceData,
        currency,
        exchange
      );

      const newAnalysis = await storage.createAnalysis({
        userId,
        symbol,
        correctedSymbol: analysisResult.correctedSymbol,
        assetName: analysisResult.assetName,
        instrumentName: analysisResult.instrumentName,
        currency,
        sourceCurrency: analysisResult.sourceCurrency,
        exchangeRate: analysisResult.exchangeRate,
        exchange,
        currentPrice: analysisResult.currentPrice,
        livePrice: analysisResult.livePrice,
        candleClosePrice: analysisResult.candleClosePrice,
        priceSource: analysisResult.priceSource,
        candleCloseTime: analysisResult.candleCloseTime,
        timeframe: analysisResult.timeframe,
        nextCandleCloseTime: analysisResult.nextCandleCloseTime,
        duration,
        market: analysisResult.marketType,
        recommendation: analysisResult.recommendation,
        confidence: analysisResult.confidence,
        sentiment: analysisResult.sentiment,
        marketSentiment: analysisResult.marketSentiment,
        newsHighlights: analysisResult.newsHighlights ?? null,
        deepAnalysis: analysisResult.deepAnalysis,
        analysis: analysisResult.analysis,
        rsi: analysisResult.indicators.rsi,
        macd: analysisResult.indicators.macd,
        stochastic: analysisResult.indicators.stochastic,
        bollingerBands: analysisResult.indicators.bollingerBands,
        entry: analysisResult.bracketOrder.entry,
        takeProfit: analysisResult.bracketOrder.takeProfit,
        stopLoss: analysisResult.bracketOrder.stopLoss,
        tp1: analysisResult.takeProfitLevels.tp1,
        tp2: analysisResult.takeProfitLevels.tp2,
        tp3: analysisResult.takeProfitLevels.tp3,
        s1: analysisResult.supportLevels.s1,
        s2: analysisResult.supportLevels.s2,
        s3: analysisResult.supportLevels.s3,
        r1: analysisResult.resistanceLevels.r1,
        r2: analysisResult.resistanceLevels.r2,
        r3: analysisResult.resistanceLevels.r3,
        trailingStopStrategy: analysisResult.trailingStopStrategy,
        probabilityScore: analysisResult.probabilityScore,
        explanatoryNotes: analysisResult.explanatoryNotes,
        language: finalLang,
        isSaved: 1,
      } as any);

      const updatedUser = await storage.decrementUserTokens(userId, 2);
      if (!updatedUser) {
        console.warn(`⚠️ [DEDUCTION FAILED] User ${userId} has insufficient tokens`);
        return res.status(400).json({ error: "Insufficient tokens for analysis" });
      }
      console.log(`✅ [DEDUCTION SUCCESS] User ${userId}: 2 tokens deducted. New balance: ${updatedUser.tokens}`);

      res.json({ 
        analysisId: newAnalysis.id, 
        newBalance: updatedUser.tokens 
      });
    } catch (err: any) {
      console.error("❌ [ANALYSIS ERROR]:", err);
      // Give user a more helpful message
      const errorMsg = err.message || "An unexpected error occurred during analysis.";
      res.status(500).json({ error: errorMsg });
    }
  });

  app.get("/api/analysis/:analysisId", async (req: Request, res: Response) => {
    try {
      const { analysisId } = req.params;
      const analysis = await storage.getAnalysis(analysisId);
      if (!analysis) return res.status(404).json({ error: "Analysis not found" });
      const uiLang =
        String(req.headers["x-ui-lang"] || "").trim() ||
        String((req.query as { lang?: string }).lang || "").trim();
      res.json(maybeRelocalizeStoredAnalysis(analysis, uiLang || undefined));
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analyses/:userId", async (req: Request, res: Response) => {
    try {
      const analyses = await storage.getAnalysesByUser(req.params.userId);
      res.json(analyses);
    } catch (error) {
      console.error("Get analyses error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analyses/saved/:userId", async (req: Request, res: Response) => {
    try {
      const savedAnalyses = await storage.getSavedAnalysesByUser(req.params.userId);
      res.json(savedAnalyses);
    } catch (error) {
      console.error("Get saved analyses error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/analysis/:id/save", async (req: Request, res: Response) => {
    try {
      const analysis = await storage.toggleSaveAnalysis(req.params.id);
      if (!analysis) return res.status(404).json({ error: "Analysis not found" });

      res.json({ success: true, isSaved: analysis.isSaved === 1, analysis });
    } catch (error) {
      console.error("Toggle save error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/analysis/:id", async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteAnalysis(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Analysis not found" });
      res.json({ success: true, message: "Analysis deleted successfully" });
    } catch (error) {
      console.error("Delete analysis error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/community/publish/:id", async (req: Request, res: Response) => {
    try {
      const analysis = await storage.publishAnalysis(req.params.id);
      if (!analysis) return res.status(404).json({ error: "Analysis not found" });
      res.json({ success: true, isPublished: true, analysis });
    } catch (error) {
      console.error("Publish error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/community/unpublish/:id", async (req: Request, res: Response) => {
    try {
      const analysis = await storage.unpublishAnalysis(req.params.id);
      if (!analysis) return res.status(404).json({ error: "Analysis not found" });
      res.json({ success: true, isPublished: false, analysis });
    } catch (error) {
      console.error("Unpublish error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---------------------------------------------
  // ✅ Community & Social
  // ---------------------------------------------
  app.get("/api/community/feed/:userId", async (req: Request, res: Response) => {
    try {
      const feed = await storage.getPublishedAnalysesFeed(req.params.userId);
      res.json(feed);
    } catch (error) {
      console.error("Get community feed error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /** Trader profile (Community → tap trader) — was missing; client always showed "Trader Not Found". */
  app.get("/api/community/user/:traderId", async (req: Request, res: Response) => {
    try {
      const { traderId } = req.params;
      const currentUserId =
        typeof req.query.currentUserId === "string" ? req.query.currentUserId.trim() : undefined;

      const user = await storage.getUser(traderId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const [followers, following, analyses] = await Promise.all([
        storage.getFollowers(traderId),
        storage.getFollowing(traderId),
        storage.getAnalysesByUser(traderId),
      ]);
      const publishedCount = analyses.filter((a) => a.isPublished === 1).length;

      let isFollowing = false;
      let isBlocked = false;
      if (currentUserId) {
        [isFollowing, isBlocked] = await Promise.all([
          storage.isFollowing(currentUserId, traderId),
          storage.isBlocked(currentUserId, traderId),
        ]);
      }

      res.json({
        user: {
          id: user.id,
          name: user.name,
          alias: user.alias,
          isBanned: user.isBanned,
          lastSeen: user.lastSeen,
        },
        stats: {
          followers: followers.length,
          following: following.length,
          publishedAnalyses: publishedCount,
        },
        relationship: {
          isFollowing,
          isBlocked,
        },
      });
    } catch (error) {
      console.error("Get community user profile error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /** Published analyses for one trader (profile grid). */
  app.get("/api/community/user/:traderId/analyses", async (req: Request, res: Response) => {
    try {
      const { traderId } = req.params;
      const user = await storage.getUser(traderId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const all = await storage.getAnalysesByUser(traderId);
      const published = all
        .filter((a) => a.isPublished === 1)
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
        );

      const author = {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        language: user.language,
        currency: user.currency,
        exchange: user.exchange,
        tokens: user.tokens,
        maxTokens: user.maxTokens,
        pwaInstallBonusClaimed: user.pwaInstallBonusClaimed,
        isAdmin: user.isAdmin,
        alias: user.alias,
        rulesAccepted: user.rulesAccepted,
        lastSeen: user.lastSeen,
        isBanned: user.isBanned,
        createdAt: user.createdAt,
      };

      const withAuthor = published.map((a) => ({ ...a, author }));
      res.json(withAuthor);
    } catch (error) {
      console.error("Get trader published analyses error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/community/rules/accept", async (req: Request, res: Response) => {
    try {
      const { userId, alias } = req.body as any;
      if (!userId || !alias) return res.status(400).json({ error: "Missing required fields" });
      
      const user = await storage.acceptCommunityRules(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      
      const updatedUser = await storage.updateAlias(userId, alias);
      res.json(updatedUser);
    } catch (error) {
      console.error("Accept rules error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /** Client (Community.tsx) sets alias first, then calls this to set rulesAccepted. */
  app.post("/api/community/accept-rules", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body as { userId?: string };
      if (!userId) return res.status(400).json({ error: "Missing userId" });
      const user = await storage.acceptCommunityRules(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      console.error("Accept rules error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/community/pinned-with-notifications/:userId", async (req: Request, res: Response) => {
    try {
      const pinned = await storage.getPinnedTradersWithNotifications(req.params.userId);
      res.json(pinned);
    } catch (error) {
      console.error("Get pinned traders error:", error);
      res.json([]); // Return empty instead of error
    }
  });

  app.post("/api/community/mark-trader-notifications-read", async (req: Request, res: Response) => {
    try {
      const { userId, traderId } = req.body as { userId?: string; traderId?: string };
      if (!userId || !traderId) {
        return res.status(400).json({ error: "Missing userId or traderId" });
      }
      await storage.markTraderNotificationsRead(userId, traderId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark trader notifications read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const reactionTypeParam = z.enum(["like", "heart", "dislike"]);

  app.post("/api/reactions", async (req: Request, res: Response) => {
    try {
      const parsed = insertReactionSchema.safeParse({
        userId: (req.body as { userId?: string })?.userId,
        analysisId: (req.body as { analysisId?: string })?.analysisId,
        reactionType: (req.body as { reactionType?: string })?.reactionType,
      });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
      }
      const reaction = await storage.addReaction(parsed.data);
      res.json(reaction);
    } catch (error) {
      console.error("Add reaction error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/reactions/:userId/:analysisId/:reactionType", async (req: Request, res: Response) => {
    try {
      const rt = reactionTypeParam.safeParse(req.params.reactionType);
      if (!rt.success) return res.status(400).json({ error: "Invalid reaction type" });
      const ok = await storage.removeReaction(req.params.userId, req.params.analysisId, rt.data);
      res.json({ success: ok });
    } catch (error) {
      console.error("Remove reaction error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/reactions/counts/:analysisId", async (req: Request, res: Response) => {
    try {
      const counts = await storage.getReactionCounts(req.params.analysisId);
      res.json(counts);
    } catch (error) {
      console.error("Reaction counts error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/reactions/user/:userId/:analysisId", async (req: Request, res: Response) => {
    try {
      const r = await storage.getUserReaction(req.params.userId, req.params.analysisId);
      res.json(r ?? null);
    } catch (error) {
      console.error("User reaction error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---------------------------------------------
  // ✅ Execute trade
  // ---------------------------------------------
  app.post("/api/execute-trade", async (req: Request, res: Response) => {
    try {
      const executeSchema = z.object({
        brokerId: z.string().min(1),
        webhookUrl: z.string().url(),
        payload: z.any(),
      });

      const validationResult = executeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const { brokerId, webhookUrl, payload } = validationResult.data;

      const broker = await storage.getBroker(brokerId);
      if (!broker) return res.status(404).json({ error: "Broker not found" });

      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(broker.apiKey ? { Authorization: `Bearer ${broker.apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        return res.status(502).json({
          error: "Broker webhook failed",
          details: errorText || webhookResponse.statusText,
          status: webhookResponse.status,
          url: webhookUrl,
        });
      }

      const responseData = await webhookResponse.json().catch(() => ({}));
      res.json({ success: true, message: "Trade executed successfully", brokerResponse: responseData });
    } catch (error: any) {
      console.error("Execute trade error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // ---------------------------------------------
  // ✅ Brokers
  // ---------------------------------------------
  app.get("/api/brokers/:userId", async (req: Request, res: Response) => {
    try {
      const brokers = await storage.getBrokersByUser(req.params.userId);
      res.json(brokers);
    } catch (error) {
      console.error("Get brokers error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/brokers", async (req: Request, res: Response) => {
    try {
      const validationResult = insertBrokerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const { userId, name, apiKey, webhookUrl, webhookMessage } = validationResult.data;

      const broker = await storage.createBroker({
        userId,
        name,
        apiKey: apiKey || null,
        webhookUrl: webhookUrl || null,
        webhookMessage: webhookMessage || null,
      });

      res.json(broker);
    } catch (error) {
      console.error("Add broker error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/brokers/:brokerId", async (req: Request, res: Response) => {
    try {
      const { brokerId } = req.params;

      const updateBrokerSchema = z
        .object({
          name: z.string().min(1).optional(),
          apiKey: z.string().nullable().optional(),
          webhookUrl: z.string().url().nullable().optional(),
          webhookMessage: z.string().nullable().optional(),
          isConnected: z.number().int().min(0).max(1).optional(),
        })
        .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided for update" });

      const validationResult = updateBrokerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const broker = await storage.updateBroker(brokerId, validationResult.data);
      if (!broker) return res.status(404).json({ error: "Broker not found" });

      res.json(broker);
    } catch (error) {
      console.error("Update broker error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/brokers/:brokerId", async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteBroker(req.params.brokerId);
      if (!deleted) return res.status(404).json({ error: "Broker not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete broker error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---------------------------------------------
  // ✅ Ads & Bonuses
  // ---------------------------------------------
  app.post("/api/watch-ad", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body as { userId: string };
      if (!userId) return res.status(400).json({ error: "User ID required" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const capCheck = checkTokenCap(user.tokens, 2);
      if (!capCheck.allowed) {
        return res.status(400).json({ error: capCheck.error });
      }

      const updatedUser = await storage.updateUserTokens(userId, user.tokens + capCheck.tokensToAdd);
      res.json({ success: true, newBalance: updatedUser?.tokens });
    } catch (error) {
      console.error("Watch ad error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/claim-install-bonus", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body as { userId: string };
      if (!userId) return res.status(400).json({ error: "User ID required" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (user.pwaInstallBonusClaimed) {
        return res.status(400).json({ error: "Bonus already claimed" });
      }

      const capCheck = checkTokenCap(user.tokens, 5);
      if (!capCheck.allowed) {
        return res.status(400).json({ error: capCheck.error });
      }

      await storage.updateUserTokens(userId, user.tokens + capCheck.tokensToAdd);
      const updatedUser = await storage.markInstallBonusClaimed(userId);
      res.json({ 
        success: true, 
        message: "Bonus tokens claimed!", 
        newBalance: updatedUser?.tokens, 
        maxTokens: updatedUser?.maxTokens 
      });
    } catch (error) {
      console.error("Claim install bonus error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ---------------------------------------------
  // ✅ Community / Messages / Notifications / Admin
  // (Your existing storage methods remain the same — kept unchanged)
  // ---------------------------------------------

  // NOTE: I am keeping the rest of your community/admin routes unchanged logic-wise,
  // but with strict request typing & profanity validation already in your code.
  // If any specific storage method name mismatches, tell me the exact method name in storage.ts,
  // and I’ll align it in 1 step.

  // Follow / Unfollow / etc...
  app.post("/api/community/follow", async (req: Request, res: Response) => {
    try {
      const { followerId, followingId } = req.body as any;
      if (!followerId || !followingId) return res.status(400).json({ error: "Missing required fields" });
      if (followerId === followingId) return res.status(400).json({ error: "Cannot follow yourself" });

      const follow = await storage.followUser(followerId, followingId);

      await storage.createNotification({
        userId: followingId,
        actorId: followerId,
        type: "follow",
        message: "started following you",
        analysisId: null,
      });

      res.json(follow);
    } catch (error) {
      console.error("Follow user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/community/unfollow", async (req: Request, res: Response) => {
    try {
      const { followerId, followingId } = req.body as any;
      if (!followerId || !followingId) return res.status(400).json({ error: "Missing required fields" });
      const success = await storage.unfollowUser(followerId, followingId);
      res.json({ success });
    } catch (error) {
      console.error("Unfollow user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/community/followers/:userId", async (req: Request, res: Response) => {
    try {
      const followers = await storage.getFollowers(req.params.userId);
      res.json(followers);
    } catch (error) {
      console.error("Get followers error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/community/following/:userId", async (req: Request, res: Response) => {
    try {
      const following = await storage.getFollowing(req.params.userId);
      res.json(following);
    } catch (error) {
      console.error("Get following error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/community/is-following/:followerId/:followingId", async (req: Request, res: Response) => {
    try {
      const { followerId, followingId } = req.params;
      const isFollowing = await storage.isFollowing(followerId, followingId);
      res.json({ isFollowing });
    } catch (error) {
      console.error("Check following error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/community/block", async (req: Request, res: Response) => {
    try {
      const { blockerId, blockedId } = req.body as any;
      if (!blockerId || !blockedId) return res.status(400).json({ error: "Missing required fields" });
      if (blockerId === blockedId) return res.status(400).json({ error: "Cannot block yourself" });

      const block = await storage.blockUser(blockerId, blockedId);
      res.json(block);
    } catch (error) {
      console.error("Block user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/community/unblock", async (req: Request, res: Response) => {
    try {
      const { blockerId, blockedId } = req.body as any;
      if (!blockerId || !blockedId) return res.status(400).json({ error: "Missing required fields" });

      const success = await storage.unblockUser(blockerId, blockedId);
      res.json({ success });
    } catch (error) {
      console.error("Unblock user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/community/blocked/:userId", async (req: Request, res: Response) => {
    try {
      const blocked = await storage.getBlockedUsers(req.params.userId);
      res.json(blocked);
    } catch (error) {
      console.error("Get blocked users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/community/alias", async (req: Request, res: Response) => {
    try {
      const { userId, alias } = req.body as any;
      if (!userId || !alias) return res.status(400).json({ error: "Missing required fields" });
      if (alias.length > 10) return res.status(400).json({ error: "Alias must be 10 characters or less" });

      try {
        validateUsername(alias);
      } catch (validationError: any) {
        return res.status(400).json({ error: validationError.message });
      }

      const user = await storage.updateAlias(userId, alias);
      if (!user) return res.status(404).json({ error: "User not found" });

      res.json(user);
    } catch (error) {
      console.error("Update alias error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Messages
  app.post("/api/messages", async (req: Request, res: Response) => {
    try {
      const { senderId, receiverId, content } = req.body as any;
      if (!senderId || !receiverId || !content) return res.status(400).json({ error: "Missing required fields" });
      if (content.length > 1000) return res.status(400).json({ error: "Message too long (max 1000 characters)" });

      try {
        validateContent(content, "Message");
      } catch (validationError: any) {
        return res.status(400).json({ error: validationError.message });
      }

      const message = await storage.sendMessage({ senderId, receiverId, content });
      res.json(message);
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/messages/conversation/:userId1/:userId2", async (req: Request, res: Response) => {
    try {
      const messages = await storage.getConversation(req.params.userId1, req.params.userId2);
      res.json(messages);
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/messages/recent/:userId", async (req: Request, res: Response) => {
    try {
      const conversations = await storage.getRecentConversations(req.params.userId);
      res.json(conversations);
    } catch (error) {
      console.error("Get recent conversations error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/messages/:messageId/read", async (req: Request, res: Response) => {
    try {
      const message = await storage.markMessageAsRead(req.params.messageId);
      if (!message) return res.status(404).json({ error: "Message not found" });
      res.json(message);
    } catch (error) {
      console.error("Mark message as read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/messages/unread-count/:userId", async (req: Request, res: Response) => {
    try {
      if (!process.env.DATABASE_URL) return res.json({ count: 0 });
      const count = await storage.getUnreadMessageCount(req.params.userId);
      res.json({ count });
    } catch (error) {
      console.error("Get unread message count error:", error);
      res.status(200).json({ count: 0 });
    }
  });

  // Reports (community abuse, feedback — visible to submitter; admins see all)
  app.post("/api/reports", async (req: Request, res: Response) => {
    try {
      const parsed = insertReportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid report" });
      }
      const data = parsed.data;
      if (data.type === "abuse_user" && !data.reportedUserId) {
        return res.status(400).json({ error: "reportedUserId is required for user reports" });
      }
      if (data.type === "abuse_post" && !data.reportedAnalysisId) {
        return res.status(400).json({ error: "reportedAnalysisId is required for post reports" });
      }

      if (!validateContent(data.subject)) {
        return res.status(400).json({ error: "Subject contains inappropriate content" });
      }
      if (!validateContent(data.message)) {
        return res.status(400).json({ error: "Report contains inappropriate content" });
      }

      const report = await storage.createReport(data);
      res.json(report);
    } catch (error) {
      console.error("Create report error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/reports/:userId", async (req: Request, res: Response) => {
    try {
      const requester = await storage.getUser(req.params.userId);
      if (!requester) return res.status(404).json({ error: "User not found" });
      const list =
        requester.isAdmin === 1
          ? await storage.getReports(undefined)
          : await storage.getReports(req.params.userId);
      res.json(list);
    } catch (error) {
      console.error("List reports error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/reports/:reportId/status", async (req: Request, res: Response) => {
    try {
      const { userId, status } = req.body as { userId?: string; status?: string };
      if (!userId || !status) return res.status(400).json({ error: "Missing userId or status" });

      const admin = await storage.getUser(userId);
      if (!admin || admin.isAdmin !== 1) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const updated = await storage.updateReportStatus(req.params.reportId, status);
      if (!updated) return res.status(404).json({ error: "Report not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update report status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

    // App version
  app.get("/api/version", async (_req: Request, res: Response) => {
    res.json({ version: APP_VERSION, updateRequired: false });
  });

  // ✅ IMPORTANT: Close the function properly and return server

  app.get("/api/test-reload", (req, res) => {
    res.json({ reloaded: true, time: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}

// ✅ Default export so index.ts can do: import routes from "./routes"
export default registerRoutes;
