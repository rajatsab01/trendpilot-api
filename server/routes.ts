import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeMarket } from "./gemini";
import { analyzeMarketWithPerplexity } from "./perplexity";
import { searchCryptoSymbols } from "./marketData";
import { fetchMarketPrice } from "./priceData";
import { validateSymbol } from "./symbolValidator";
import { symbolRegistry } from "./symbolRegistry";
import { validateContent, validateUsername } from "./profanityFilter";
import { z } from "zod";
import { insertUserSchema, insertBrokerSchema, APP_VERSION } from "@shared/schema";
import Razorpay from "razorpay";
import crypto from "crypto";

// 🔒 SECURITY: Token cap during testing period to prevent abuse
// While Razorpay is in test mode, limit max tokens to prevent users from accumulating
// thousands of free "test" tokens that would become real when switching to live mode
const TEST_MODE_ACTIVE = true; // Set to false when switching to live Razorpay
const TEST_MODE_TOKEN_CAP = 10; // Maximum tokens allowed during testing

/**
 * Check if adding tokens would exceed the test mode cap
 * @returns { allowed: boolean, error?: string, maxTokens?: number }
 */
function checkTokenCap(currentTokens: number, tokensToAdd: number) {
  if (!TEST_MODE_ACTIVE) {
    return { allowed: true }; // No cap in production mode
  }

  const newBalance = currentTokens + tokensToAdd;
  if (newBalance > TEST_MODE_TOKEN_CAP) {
    return {
      allowed: false,
      error: `Testing period limit: Maximum ${TEST_MODE_TOKEN_CAP} tokens allowed. You currently have ${currentTokens} tokens. This cap will be removed once the app launches with live payments.`,
      maxTokens: TEST_MODE_TOKEN_CAP
    };
  }

  return { allowed: true };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Verify phone number from Phone.Email service
  app.post("/api/auth/verify-phone", async (req, res) => {
    try {
      const { userJsonUrl } = req.body;
      if (!userJsonUrl) {
        return res.status(400).json({ error: "User JSON URL required" });
      }

      // Security: Validate URL is from Phone.Email domain to prevent SSRF
      let parsedUrl;
      try {
        parsedUrl = new URL(userJsonUrl);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      // Only allow HTTPS requests to phone.email domain
      if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "user.phone.email") {
        return res.status(400).json({ error: "Invalid verification URL" });
      }

      // Fetch verified phone data from Phone.Email
      const response = await fetch(userJsonUrl);
      if (!response.ok) {
        return res.status(400).json({ error: "Failed to verify phone number" });
      }

      const data = await response.json();
      const { user_country_code, user_phone_number } = data;

      if (!user_country_code || !user_phone_number) {
        return res.status(400).json({ error: "Invalid phone data" });
      }

      // Combine country code and phone number
      const phoneNumber = `+${user_country_code}${user_phone_number}`;

      res.json({ 
        phoneNumber,
        countryCode: user_country_code,
        verified: true 
      });
    } catch (error) {
      console.error("Phone verification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Auth/Login - creates or retrieves user
  app.post("/api/auth/login", async (req, res) => {
    try {
      // Validate request body
      const loginSchema = z.object({
        name: z.string().min(1),
        mobile: z.string().min(10),
        language: z.enum(["en", "hi", "es", "zh", "de", "fr", "ar", "pt", "ru", "ja", "ko", "it"]),
      });

      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const { name, mobile, language } = validationResult.data;

      // Normalize phone number: remove spaces, dashes
      const normalizedMobile = mobile.replace(/[\s-]/g, '');

      // Try to find user with multiple format variations for backwards compatibility
      let user = await storage.getUserByMobile(normalizedMobile);
      
      // If not found, try variations to support legacy 10-digit phone numbers
      if (!user && normalizedMobile.startsWith('+')) {
        // Try without the + prefix (e.g., '911234567890')
        const withoutPlus = normalizedMobile.substring(1);
        user = await storage.getUserByMobile(withoutPlus);
        
        // Try last 10 digits only (for legacy users who stored just phone without country code)
        if (!user && withoutPlus.length > 10) {
          const last10Digits = withoutPlus.slice(-10);
          user = await storage.getUserByMobile(last10Digits);
        }
        
        // If found with old format, migrate to new format with +
        if (user) {
          await storage.updateUserMobile(user.id, normalizedMobile);
        }
      }

      if (!user) {
        // Create new user with 20 starting tokens
        user = await storage.createUser({
          name,
          mobile: normalizedMobile,
          language,
          tokens: 20,
        });
        return res.json({ userId: user.id, tokens: user.tokens });
      }

      // Update user's language if it has changed (sync frontend preference with database)
      if (user.language !== language) {
        await storage.updateUserLanguage(user.id, language);
        user.language = language;
      }

      // Return existing user
      res.json({ userId: user.id, tokens: user.tokens });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user details
  app.get("/api/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update user preferences (currency, language, etc.)
  app.patch("/api/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const updateSchema = z.object({
        currency: z.string().optional(),
        language: z.string().optional(),
        exchange: z.string().optional(),
      });

      const validationResult = updateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const updates = validationResult.data;
      const updatedUser = await storage.updateUserPreferences(userId, updates);

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Razorpay: Create order for token purchase
  app.post("/api/payment/create-order", async (req, res) => {
    try {
      const { userId, tokenPackage } = req.body;
      
      if (!userId || !tokenPackage) {
        return res.status(400).json({ error: "User ID and token package required" });
      }

      // Token packages with INR pricing
      const packages: Record<string, { tokens: number; amount: number }> = {
        small: { tokens: 10, amount: 9900 },      // ₹99
        medium: { tokens: 100, amount: 89900 },   // ₹899
        large: { tokens: 500, amount: 399900 },   // ₹3,999
      };

      const selectedPackage = packages[tokenPackage];
      if (!selectedPackage) {
        return res.status(400).json({ error: "Invalid token package" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if Razorpay is configured
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.log("Razorpay not configured, using demo mode");
        // Demo mode - return mock order
        return res.json({
          orderId: `demo_order_${Date.now()}`,
          amount: selectedPackage.amount,
          currency: "INR",
          keyId: "demo_key",
          demoMode: true,
          tokens: selectedPackage.tokens,
        });
      }

      // Real Razorpay integration
      console.log("Initializing Razorpay with keys...");
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      console.log("Creating Razorpay order...");
      // Generate short receipt (max 40 chars per Razorpay requirement)
      const shortUserId = userId.split('-')[0]; // First 8 chars of UUID
      const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
      const receipt = `rcpt_${shortUserId}_${timestamp}`; // ~22 chars total
      
      const order = await razorpay.orders.create({
        amount: selectedPackage.amount, // amount in paise
        currency: "INR",
        receipt: receipt,
        notes: {
          userId,
          tokens: selectedPackage.tokens,
        },
      });
      console.log("Razorpay order created successfully:", order.id);

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
      console.error("Error stack:", error.stack);
      console.error("Error details:", JSON.stringify(error, null, 2));
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Razorpay: Verify payment and add tokens
  app.post("/api/payment/verify", async (req, res) => {
    try {
      const { userId, orderId, paymentId, signature, tokens, demoMode } = req.body;

      if (!userId || !tokens) {
        return res.status(400).json({ error: "User ID and tokens required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Demo mode - just add tokens without verification
      if (demoMode) {
        console.log(`Demo mode: Adding ${tokens} tokens to user ${userId}`);
        
        // Check token cap before adding
        const capCheck = checkTokenCap(user.tokens, tokens);
        if (!capCheck.allowed) {
          return res.status(400).json({ 
            error: capCheck.error,
            tokenCapReached: true,
            currentTokens: user.tokens,
            maxTokens: capCheck.maxTokens
          });
        }
        
        await storage.updateUserTokens(userId, user.tokens + tokens);
        return res.json({ 
          success: true, 
          newBalance: user.tokens + tokens,
          message: "Demo payment successful" 
        });
      }

      // Real Razorpay verification
      if (!paymentId || !signature) {
        return res.status(400).json({ error: "Payment ID and signature required" });
      }

      const body = orderId + "|" + paymentId;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: "Invalid payment signature" });
      }

      // Payment verified - check token cap before adding
      const capCheck = checkTokenCap(user.tokens, tokens);
      if (!capCheck.allowed) {
        return res.status(400).json({ 
          error: capCheck.error,
          tokenCapReached: true,
          currentTokens: user.tokens,
          maxTokens: capCheck.maxTokens
        });
      }
      
      // Add tokens
      await storage.updateUserTokens(userId, user.tokens + tokens);

      res.json({ 
        success: true, 
        newBalance: user.tokens + tokens,
        message: "Payment successful" 
      });
    } catch (error: any) {
      console.error("Verify payment error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Razorpay: Create charity donation order
  app.post("/api/charity/create-order", async (req, res) => {
    try {
      const { userId, amount } = req.body;

      if (!userId || !amount || amount < 10) {
        return res.status(400).json({ error: "Invalid donation amount. Minimum ₹10 required." });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log("Initializing Razorpay for charity donation...");
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      console.log("Creating Razorpay charity order...");
      const shortUserId = userId.split('-')[0];
      const timestamp = Date.now().toString().slice(-8);
      const receipt = `char_${shortUserId}_${timestamp}`;
      
      const order = await razorpay.orders.create({
        amount: amount * 100, // amount in paise
        currency: "INR",
        receipt: receipt,
        notes: {
          userId,
          type: "charity",
          amount: amount,
        },
      });
      console.log("Razorpay charity order created successfully:", order.id);

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (error: any) {
      console.error("Create charity order error:", error);
      console.error("Error stack:", error.stack);
      console.error("Error details:", JSON.stringify(error, null, 2));
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Razorpay: Verify charity donation payment
  app.post("/api/charity/verify", async (req, res) => {
    try {
      const { userId, orderId, paymentId, signature, amount } = req.body;

      if (!userId || !amount) {
        return res.status(400).json({ error: "User ID and amount required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Real Razorpay verification
      if (!paymentId || !signature) {
        return res.status(400).json({ error: "Payment ID and signature required" });
      }

      const body = orderId + "|" + paymentId;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: "Invalid payment signature" });
      }

      // Payment verified successfully
      console.log(`Charity donation verified: User ${userId} donated ₹${amount}`);

      res.json({ 
        success: true, 
        message: "Thank you for your generous donation!" 
      });
    } catch (error: any) {
      console.error("Verify charity payment error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // In-memory store for tracking ad watch history per user
  // Structure: Map<userId, { count: number, firstWatchToday: number }>
  const adWatchHistory = new Map<string, { count: number, firstWatchToday: number }>();

  // Claim Install Bonus - Add 5 free tokens for installing PWA (ONE-TIME ONLY)
  app.post("/api/claim-install-bonus", async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // SERVER-SIDE CHECK: Verify bonus hasn't been claimed already
      if (user.pwaInstallBonusClaimed === 1) {
        return res.status(400).json({ 
          error: "Install bonus already claimed",
          alreadyClaimed: true
        });
      }

      // Check token cap before adding bonus
      const capCheck = checkTokenCap(user.tokens, 5);
      if (!capCheck.allowed) {
        return res.status(400).json({ 
          error: capCheck.error,
          tokenCapReached: true,
          currentTokens: user.tokens,
          maxTokens: capCheck.maxTokens
        });
      }

      // Add 5 tokens for installing the app
      const newTokenBalance = user.tokens + 5;
      await storage.updateUserTokens(userId, newTokenBalance);

      // Mark bonus as claimed in database
      await storage.markInstallBonusClaimed(userId);

      console.log(`User ${userId} installed PWA and received 5 bonus tokens (FIRST TIME). New balance: ${newTokenBalance}`);

      // Get updated user with maxTokens
      const updatedUser = await storage.getUser(userId);

      res.json({ 
        success: true, 
        tokensAdded: 5,
        newBalance: newTokenBalance,
        maxTokens: updatedUser?.maxTokens ?? newTokenBalance
      });
    } catch (error: any) {
      console.error("Claim install bonus error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Watch Ad - Add 2 free tokens for watching an ad
  // Limit: 2 ads per 24 hours per user
  app.post("/api/watch-ad", async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      // Get or initialize user's watch history
      let history = adWatchHistory.get(userId);
      
      if (!history) {
        // First time watching
        history = { count: 0, firstWatchToday: now };
        adWatchHistory.set(userId, history);
      } else {
        // Check if 24 hours have passed since first watch
        const timeSinceFirst = now - history.firstWatchToday;
        
        if (timeSinceFirst >= twentyFourHours) {
          // Reset counter after 24 hours
          history.count = 0;
          history.firstWatchToday = now;
        } else if (history.count >= 2) {
          // Already watched 2 ads in the last 24 hours
          const hoursRemaining = Math.ceil((twentyFourHours - timeSinceFirst) / (60 * 60 * 1000));
          return res.status(429).json({ 
            error: `You've reached the daily limit of 2 ads. Please try again in ${hoursRemaining} hours.`,
            limit: true,
            hoursRemaining
          });
        }
      }

      // Increment watch count
      history.count++;

      // Check token cap before adding ad tokens
      const capCheck = checkTokenCap(user.tokens, 2);
      if (!capCheck.allowed) {
        // Decrement count since we didn't actually add tokens
        history.count--;
        return res.status(400).json({ 
          error: capCheck.error,
          tokenCapReached: true,
          currentTokens: user.tokens,
          maxTokens: capCheck.maxTokens
        });
      }

      // Add 2 tokens for watching the ad
      const newTokenBalance = user.tokens + 2;
      await storage.updateUserTokens(userId, newTokenBalance);

      console.log(`User ${userId} watched ad (${history.count}/2 today) and earned 2 tokens. New balance: ${newTokenBalance}`);

      res.json({ 
        success: true, 
        tokensAdded: 2,
        newBalance: newTokenBalance,
        remainingAds: 2 - history.count
      });
    } catch (error: any) {
      console.error("Watch ad error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Search/validate symbols for a given market
  app.get("/api/symbols/search", async (req, res) => {
    try {
      const { query, market } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query parameter required" });
      }
      
      if (!market || typeof market !== 'string') {
        return res.status(400).json({ error: "Market parameter required" });
      }

      // Currently only supporting cryptocurrency market symbol search
      if (market === 'cryptocurrency') {
        const suggestions = await searchCryptoSymbols(query);
        return res.json({ suggestions });
      }

      // For other markets, return empty suggestions for now
      res.json({ suggestions: [] });
    } catch (error: any) {
      console.error("Symbol search error:", error);
      res.status(500).json({ error: "Failed to search symbols" });
    }
  });

  // Intelligent instrument search by name
  app.get("/api/search-instruments", async (req, res) => {
    try {
      const { query, market } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ suggestions: [] });
      }

      const { searchInstruments, getPopularInstruments } = await import("./instrumentSearch.js");
      
      // Helper function to augment suggestions with classification from registry
      const augmentWithClassification = (suggestions: any[]) => {
        return suggestions.map(suggestion => {
          const registryEntry = symbolRegistry.get(suggestion.symbol);
          return {
            ...suggestion,
            classification: registryEntry?.classification || undefined
          };
        });
      };
      
      // If query is too short, return popular instruments
      if (query.trim().length < 2) {
        const popular = getPopularInstruments(market as string);
        return res.json({ suggestions: augmentWithClassification(popular) });
      }

      // Search by name
      const results = searchInstruments(query);
      
      // Filter by market if specified
      const filtered = market 
        ? results.filter(r => r.market === market)
        : results;

      // Augment results with classification from registry
      res.json({ suggestions: augmentWithClassification(filtered) });
    } catch (error: any) {
      console.error("Instrument search error:", error);
      res.status(500).json({ error: "Failed to search instruments", suggestions: [] });
    }
  });

  // Validate symbol and provide suggestions
  app.post("/api/symbols/validate", async (req, res) => {
    try {
      console.log(`📥 [/api/symbols/validate] Received request body:`, JSON.stringify(req.body));
      
      const validateSchema = z.object({
        symbol: z.string().min(1),
        market: z.enum(["stock", "commodity", "forex", "cryptocurrency"]),
      });

      const validationResult = validateSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log(`❌ [/api/symbols/validate] Validation error:`, validationResult.error.errors);
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const { symbol, market } = validationResult.data;

      console.log(`🔍 Validating symbol "${symbol}" for ${market} market...`);
      const result = await validateSymbol(symbol, market);
      
      if (result.isValid) {
        console.log(`✅ Symbol "${symbol}" validated successfully:`, result.correctedSymbol);
      } else {
        console.log(`⚠️ Symbol "${symbol}" validation failed:`, result.error);
      }

      res.json(result);
    } catch (error: any) {
      console.error("Symbol validation error:", error);
      res.status(500).json({ error: "Failed to validate symbol" });
    }
  });

  // Analyze market symbol
  app.post("/api/analyze", async (req, res) => {
    try {
      // Validate request body with market type
      const analyzeSchema = z.object({
        userId: z.string().min(1),
        symbol: z.string().min(1),
        duration: z.enum(["long_term", "short_term", "scalping"]),
        market: z.enum(["stock", "commodity", "forex", "cryptocurrency"]),
        currency: z.string().optional().default("USD"),
        exchange: z.string().optional(),
      });

      const validationResult = analyzeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const { userId, symbol, duration, market, currency, exchange } = validationResult.data;

      // Check user has enough tokens
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.tokens < 2) {
        return res.status(400).json({ error: "Insufficient tokens" });
      }

      // 🎯 STEP 1: PRE-FLIGHT VALIDATION - Fetch accurate prices from Yahoo Finance / Binance
      // This prevents wasting tokens on invalid symbols before running expensive Perplexity analysis
      console.log(`🔍 [PRE-FLIGHT] Validating symbol "${symbol}" for ${market} market...`);
      
      let priceData;
      try {
        priceData = await fetchMarketPrice(symbol, duration, market);
        console.log(`✅ [PRE-FLIGHT] Symbol validated successfully - price data retrieved`);
        console.log(`   Live price: ${priceData.livePrice}, Candle close: ${priceData.candleClosePrice}`);
      } catch (error: any) {
        console.error(`❌ [PRE-FLIGHT] Symbol validation failed for ${symbol}:`, error.message);
        console.log(`   ⚠️  Analysis aborted - no tokens consumed`);
        
        return res.status(400).json({ 
          error: `Unable to fetch price data for symbol "${symbol}". Please verify the symbol is correct for ${market} market. No tokens were consumed.`,
          hint: "Try using the autocomplete suggestions to find the correct symbol format."
        });
      }

      // 🎯 STEP 2: Perform analysis using Perplexity with pre-fetched prices
      const analysisResult = await analyzeMarketWithPerplexity(symbol, duration, market, user.language, priceData, currency, exchange);

      // Save analysis with Perplexity-validated metadata (including auto-detected market)
      const analysis = await storage.createAnalysis({
        userId,
        symbol, // Original user-entered symbol (may be misspelled)
        correctedSymbol: analysisResult.correctedSymbol, // Perplexity-corrected symbol
        assetName: analysisResult.assetName, // Perplexity-validated full name
        instrumentName: analysisResult.instrumentName, // For backward compatibility
        currency, // User's preferred currency for this analysis
        sourceCurrency: analysisResult.sourceCurrency, // Original currency from exchange
        exchange, // User's preferred exchange for this analysis
        currentPrice: analysisResult.currentPrice, // DEPRECATED: Use candleClosePrice instead
        livePrice: analysisResult.livePrice, // Actual current live market price
        candleClosePrice: analysisResult.candleClosePrice, // Price at closed candle for analysis
        priceSource: analysisResult.priceSource, // Where Perplexity found the price
        candleCloseTime: analysisResult.candleCloseTime, // Timestamp of candle close
        timeframe: analysisResult.timeframe, // Candle timeframe (e.g., "15min", "1hr", "1day")
        nextCandleCloseTime: analysisResult.nextCandleCloseTime, // When next candle closes
        duration,
        market: analysisResult.marketType as "stock" | "commodity" | "forex" | "cryptocurrency", // Auto-detected by Perplexity
        recommendation: analysisResult.recommendation,
        confidence: analysisResult.confidence,
        sentiment: analysisResult.sentiment,
        marketSentiment: analysisResult.marketSentiment,
        deepAnalysis: analysisResult.deepAnalysis,
        analysis: analysisResult.analysis,
        rsi: analysisResult.indicators.rsi,
        macd: analysisResult.indicators.macd,
        stochastic: analysisResult.indicators.stochastic,
        bollingerBands: analysisResult.indicators.bollingerBands,
        entry: analysisResult.bracketOrder.entry,
        takeProfit: analysisResult.bracketOrder.takeProfit,
        stopLoss: analysisResult.bracketOrder.stopLoss,
        // Enhanced risk-reward fields
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
      });

      // Only deduct tokens after successful analysis (atomic operation to prevent race conditions)
      const updatedUser = await storage.decrementUserTokens(userId, 2);
      if (!updatedUser) {
        // This can happen if tokens were consumed by concurrent request
        return res.status(400).json({ error: "Insufficient tokens. Please try again." });
      }

      res.json({ analysisId: analysis.id });
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Get analysis by ID
  app.get("/api/analysis/:analysisId", async (req, res) => {
    try {
      const { analysisId } = req.params;
      const analysis = await storage.getAnalysis(analysisId);

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      res.json(analysis);
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's analyses
  app.get("/api/analyses/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const analyses = await storage.getAnalysesByUser(userId);
      res.json(analyses);
    } catch (error) {
      console.error("Get analyses error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's saved analyses
  app.get("/api/analyses/saved/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const savedAnalyses = await storage.getSavedAnalysesByUser(userId);
      res.json(savedAnalyses);
    } catch (error) {
      console.error("Get saved analyses error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Toggle save status for an analysis
  app.post("/api/analysis/:id/save", async (req, res) => {
    try {
      const { id } = req.params;
      const analysis = await storage.toggleSaveAnalysis(id);
      
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      res.json({ 
        success: true, 
        isSaved: analysis.isSaved === 1,
        analysis 
      });
    } catch (error) {
      console.error("Toggle save error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete an analysis
  app.delete("/api/analysis/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAnalysis(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      res.json({ success: true, message: "Analysis deleted successfully" });
    } catch (error) {
      console.error("Delete analysis error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Execute trade - send webhook to broker
  app.post("/api/execute-trade", async (req, res) => {
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

      // Verify broker exists
      const broker = await storage.getBroker(brokerId);
      if (!broker) {
        return res.status(404).json({ error: "Broker not found" });
      }

      // Send webhook to broker
      console.log("Sending webhook to broker:", webhookUrl);
      console.log("Payload:", JSON.stringify(payload, null, 2));
      
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(broker.apiKey && { "Authorization": `Bearer ${broker.apiKey}` }),
        },
        body: JSON.stringify(payload),
      });

      console.log("Broker response status:", webhookResponse.status);

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error("Broker webhook error:", errorText);
        return res.status(502).json({ 
          error: "Broker webhook failed", 
          details: errorText || webhookResponse.statusText,
          status: webhookResponse.status,
          url: webhookUrl
        });
      }

      const responseData = await webhookResponse.json().catch(() => ({}));

      res.json({ 
        success: true, 
        message: "Trade executed successfully",
        brokerResponse: responseData
      });
    } catch (error: any) {
      console.error("Execute trade error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Get user's brokers
  app.get("/api/brokers/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const brokers = await storage.getBrokersByUser(userId);
      res.json(brokers);
    } catch (error) {
      console.error("Get brokers error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Add broker
  app.post("/api/brokers", async (req, res) => {
    try {
      // Validate request body
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

  // Update broker
  app.patch("/api/brokers/:brokerId", async (req, res) => {
    try {
      const { brokerId } = req.params;

      // Validate update payload
      const updateBrokerSchema = z.object({
        name: z.string().min(1).optional(),
        apiKey: z.string().nullable().optional(),
        webhookUrl: z.string().url().nullable().optional(),
        webhookMessage: z.string().nullable().optional(),
        isConnected: z.number().int().min(0).max(1).optional(),
      }).refine(
        (data) => Object.keys(data).length > 0,
        { message: "At least one field must be provided for update" }
      );

      const validationResult = updateBrokerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const broker = await storage.updateBroker(brokerId, validationResult.data);

      if (!broker) {
        return res.status(404).json({ error: "Broker not found" });
      }

      res.json(broker);
    } catch (error) {
      console.error("Update broker error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete broker
  app.delete("/api/brokers/:brokerId", async (req, res) => {
    try {
      const { brokerId } = req.params;
      const deleted = await storage.deleteBroker(brokerId);

      if (!deleted) {
        return res.status(404).json({ error: "Broker not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete broker error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========================================
  // COMMUNITY ROUTES
  // ========================================

  // Follow a user
  app.post("/api/community/follow", async (req, res) => {
    try {
      const { followerId, followingId } = req.body;

      if (!followerId || !followingId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (followerId === followingId) {
        return res.status(400).json({ error: "Cannot follow yourself" });
      }

      const follow = await storage.followUser(followerId, followingId);
      
      // Create notification for the user being followed
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

  // Unfollow a user
  app.post("/api/community/unfollow", async (req, res) => {
    try {
      const { followerId, followingId } = req.body;

      if (!followerId || !followingId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const success = await storage.unfollowUser(followerId, followingId);
      res.json({ success });
    } catch (error) {
      console.error("Unfollow user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get followers
  app.get("/api/community/followers/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const followers = await storage.getFollowers(userId);
      res.json(followers);
    } catch (error) {
      console.error("Get followers error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get following
  app.get("/api/community/following/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const following = await storage.getFollowing(userId);
      res.json(following);
    } catch (error) {
      console.error("Get following error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Check if following
  app.get("/api/community/is-following/:followerId/:followingId", async (req, res) => {
    try {
      const { followerId, followingId } = req.params;
      const isFollowing = await storage.isFollowing(followerId, followingId);
      res.json({ isFollowing });
    } catch (error) {
      console.error("Check following error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Block a user
  app.post("/api/community/block", async (req, res) => {
    try {
      const { blockerId, blockedId } = req.body;

      if (!blockerId || !blockedId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (blockerId === blockedId) {
        return res.status(400).json({ error: "Cannot block yourself" });
      }

      const block = await storage.blockUser(blockerId, blockedId);
      res.json(block);
    } catch (error) {
      console.error("Block user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Unblock a user
  app.post("/api/community/unblock", async (req, res) => {
    try {
      const { blockerId, blockedId } = req.body;

      if (!blockerId || !blockedId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const success = await storage.unblockUser(blockerId, blockedId);
      res.json({ success });
    } catch (error) {
      console.error("Unblock user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get blocked users
  app.get("/api/community/blocked/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const blocked = await storage.getBlockedUsers(userId);
      res.json(blocked);
    } catch (error) {
      console.error("Get blocked users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update user alias
  app.post("/api/community/alias", async (req, res) => {
    try {
      const { userId, alias } = req.body;

      if (!userId || !alias) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (alias.length > 10) {
        return res.status(400).json({ error: "Alias must be 10 characters or less" });
      }

      // 🔒 PROFANITY FILTER: Validate alias for inappropriate content
      try {
        validateUsername(alias);
      } catch (validationError: any) {
        return res.status(400).json({ error: validationError.message });
      }

      const user = await storage.updateAlias(userId, alias);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Update alias error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Accept community rules
  app.post("/api/community/accept-rules", async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Verify minimum saved analyses requirement (10 trades)
      const analyses = await storage.getSavedAnalysesByUser(userId);
      if (analyses.length < 10) {
        return res.status(403).json({ 
          error: "Minimum requirement not met",
          message: "You need at least 10 saved trades to access the community"
        });
      }

      const user = await storage.acceptCommunityRules(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Accept rules error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update last seen
  app.post("/api/community/update-last-seen", async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const user = await storage.updateLastSeen(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Update last seen error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Search users by alias
  app.get("/api/community/search/:query", async (req, res) => {
    try {
      const { query } = req.params;

      if (!query || query.length < 2) {
        return res.status(400).json({ error: "Query must be at least 2 characters" });
      }

      const users = await storage.searchUsersByAlias(query);
      res.json(users);
    } catch (error) {
      console.error("Search users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user profile with stats
  app.get("/api/community/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.query.currentUserId as string;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get stats
      const followers = await storage.getFollowers(userId);
      const following = await storage.getFollowing(userId);
      const publishedAnalyses = await storage.getPublishedAnalysesFeed(userId);
      
      // Filter to get only this user's published analyses
      const userPublishedAnalyses = publishedAnalyses.filter(item => item.author.id === userId);

      // Check relationship with current user
      let isFollowing = false;
      let isBlocked = false;
      if (currentUserId && currentUserId !== userId) {
        isFollowing = await storage.isFollowing(currentUserId, userId);
        isBlocked = await storage.isBlocked(currentUserId, userId);
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
          publishedAnalyses: userPublishedAnalyses.length,
        },
        relationship: {
          isFollowing,
          isBlocked,
        },
      });
    } catch (error) {
      console.error("Get user profile error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get user's published analyses
  app.get("/api/community/user/:userId/analyses", async (req, res) => {
    try {
      const { userId } = req.params;
      
      const feed = await storage.getPublishedAnalysesFeed(userId);
      
      // Filter to only this user's published analyses
      const userAnalyses = feed.filter(item => item.author.id === userId);

      res.json(userAnalyses);
    } catch (error) {
      console.error("Get user analyses error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Send message
  app.post("/api/messages", async (req, res) => {
    try {
      const { senderId, receiverId, content } = req.body;

      if (!senderId || !receiverId || !content) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (content.length > 1000) {
        return res.status(400).json({ error: "Message too long (max 1000 characters)" });
      }

      // 🔒 PROFANITY FILTER: Validate message content
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

  // Get conversation between two users
  app.get("/api/messages/conversation/:userId1/:userId2", async (req, res) => {
    try {
      const { userId1, userId2 } = req.params;
      const messages = await storage.getConversation(userId1, userId2);
      res.json(messages);
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get recent conversations
  app.get("/api/messages/recent/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const conversations = await storage.getRecentConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Get recent conversations error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Mark message as read
  app.post("/api/messages/:messageId/read", async (req, res) => {
    try {
      const { messageId } = req.params;
      const message = await storage.markMessageAsRead(messageId);

      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }

      res.json(message);
    } catch (error) {
      console.error("Mark message as read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get unread message count
  app.get("/api/messages/unread-count/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Get unread message count error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Publish analysis
  app.post("/api/community/publish/:analysisId", async (req, res) => {
    try {
      const { analysisId } = req.params;
      const analysis = await storage.publishAnalysis(analysisId);

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Get followers of the user who published the analysis
      const followers = await storage.getFollowers(analysis.userId);

      // Notify all followers about the new published analysis
      for (const follower of followers) {
        await storage.createNotification({
          userId: follower.id,
          actorId: analysis.userId,
          type: "new_analysis",
          message: `published a new ${analysis.duration} analysis for ${analysis.symbol}`,
          analysisId: analysis.id,
        });
      }

      res.json(analysis);
    } catch (error) {
      console.error("Publish analysis error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Unpublish analysis
  app.post("/api/community/unpublish/:analysisId", async (req, res) => {
    try {
      const { analysisId } = req.params;
      const analysis = await storage.unpublishAnalysis(analysisId);

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      res.json(analysis);
    } catch (error) {
      console.error("Unpublish analysis error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get community feed (published analyses from followed users)
  app.get("/api/community/feed/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const feed = await storage.getPublishedAnalysesFeed(userId);
      res.json(feed);
    } catch (error) {
      console.error("Get feed error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get notifications
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Mark notification as read
  app.post("/api/notifications/:notificationId/read", async (req, res) => {
    try {
      const { notificationId } = req.params;
      const notification = await storage.markNotificationAsRead(notificationId);

      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json(notification);
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========================================
  // ADMIN REPORT ROUTES
  // ========================================

  // Create a report
  app.post("/api/reports", async (req, res) => {
    try {
      const { userId, type, subject, message } = req.body;

      if (!userId || !type || !subject || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (message.length < 10) {
        return res.status(400).json({ error: "Message must be at least 10 characters" });
      }

      // 🔒 PROFANITY FILTER: Validate report subject and message
      try {
        validateContent(subject, "Subject");
        validateContent(message, "Message");
      } catch (validationError: any) {
        return res.status(400).json({ error: validationError.message });
      }

      const report = await storage.createReport({
        userId,
        type,
        subject,
        message,
      });

      // Get admin users
      const adminUser = await storage.getUserByMobile("+919811209473"); // Your admin phone number
      
      if (adminUser) {
        // Notify admin about new report
        await storage.createNotification({
          userId: adminUser.id,
          actorId: userId,
          type: "admin_report",
          message: `submitted a ${type} report: ${subject}`,
          analysisId: null,
        });
      }

      res.json(report);
    } catch (error) {
      console.error("Create report error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get reports (user's own or all if admin)
  app.get("/api/reports/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If admin, get all reports; otherwise, get user's own reports
      const reports = user.isAdmin === 1 
        ? await storage.getReports() 
        : await storage.getReports(userId);
      
      res.json(reports);
    } catch (error) {
      console.error("Get reports error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update report status (admin only)
  app.patch("/api/reports/:reportId/status", async (req, res) => {
    try {
      const { reportId } = req.params;
      const { userId, status } = req.body;

      const user = await storage.getUser(userId);

      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Unauthorized - Admin only" });
      }

      const report = await storage.updateReportStatus(reportId, status);

      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      res.json(report);
    } catch (error) {
      console.error("Update report status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Test all symbols in the database (admin only)
  app.post("/api/admin/test-symbols", async (req, res) => {
    try {
      const { userId } = req.body;

      const user = await storage.getUser(userId);

      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Unauthorized - Admin only" });
      }

      console.log("🧪 Starting comprehensive symbol testing suite (triggered by admin)...");

      // Import and run the test suite
      const { testAllSymbols } = await import("./symbolTester.js");
      const report = await testAllSymbols();

      res.json({
        success: true,
        report,
        summary: {
          totalSymbols: report.totalSymbols,
          workingSymbols: report.workingSymbols,
          brokenSymbols: report.brokenSymbols,
          successRate: report.successRate,
        },
      });
    } catch (error: any) {
      console.error("Symbol testing error:", error);
      res.status(500).json({ error: "Failed to test symbols", details: error.message });
    }
  });

  // Get app version - used for version checking and update notifications
  app.get("/api/version", async (req, res) => {
    try {
      res.json({ 
        version: APP_VERSION,
        updateRequired: false // Will be determined by client comparison
      });
    } catch (error) {
      console.error("Get version error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Get symbol health statistics and last test results
  app.get("/api/admin/symbol-health", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify admin status
      const user = await storage.getUser(userId);
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get registry statistics
      const allSymbols = symbolRegistry.getAll();
      const stats = {
        total: allSymbols.length,
        verified: allSymbols.filter(s => s.status === 'verified').length,
        byMarket: {} as Record<string, number>,
        byClassification: {} as Record<string, number>,
      };

      allSymbols.forEach(symbol => {
        stats.byMarket[symbol.market] = (stats.byMarket[symbol.market] || 0) + 1;
        stats.byClassification[symbol.classification] = (stats.byClassification[symbol.classification] || 0) + 1;
      });

      // Try to read last test results from file
      let lastTestResults = null;
      try {
        const fs = await import('fs');
        const path = await import('path');
        const reportPath = path.join(process.cwd(), 'symbol-test-report.json');
        if (fs.existsSync(reportPath)) {
          const reportData = fs.readFileSync(reportPath, 'utf-8');
          lastTestResults = JSON.parse(reportData);
        }
      } catch (error) {
        console.error("Error reading test results:", error);
      }

      res.json({
        registryStats: stats,
        lastTestResults,
      });
    } catch (error: any) {
      console.error("Symbol health error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Run symbol tests
  app.post("/api/admin/run-symbol-tests", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify admin status
      const user = await storage.getUser(userId);
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Import and run symbol tests
      const { testAllSymbols } = await import("./symbolTester.js");
      console.log("🧪 Admin triggered symbol test suite...");
      const report = await testAllSymbols();

      // Save report to file
      const fs = await import('fs');
      const path = await import('path');
      const reportPath = path.join(process.cwd(), 'symbol-test-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      res.json({
        success: true,
        report,
      });
    } catch (error: any) {
      console.error("Run symbol tests error:", error);
      res.status(500).json({ error: "Failed to run tests" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
