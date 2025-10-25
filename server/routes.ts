import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeMarket } from "./gemini";
import { analyzeMarketWithPerplexity } from "./perplexity";
import { searchCryptoSymbols } from "./marketData";
import { fetchMarketPrice } from "./priceData";
import { z } from "zod";
import { insertUserSchema, insertBrokerSchema } from "@shared/schema";
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

  // Analyze market symbol
  app.post("/api/analyze", async (req, res) => {
    try {
      // Validate request body with market type
      const analyzeSchema = z.object({
        userId: z.string().min(1),
        symbol: z.string().min(1),
        duration: z.enum(["long_term", "short_term", "scalping"]),
        market: z.enum(["stock_equities", "commodity", "forex", "derivatives_futures", "bond", "cryptocurrency"]),
      });

      const validationResult = analyzeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const { userId, symbol, duration, market } = validationResult.data;

      // Check user has enough tokens
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.tokens < 2) {
        return res.status(400).json({ error: "Insufficient tokens" });
      }

      // 🎯 STEP 1: Fetch accurate prices from Yahoo Finance / Binance
      let priceData;
      try {
        priceData = await fetchMarketPrice(symbol, duration, market);
        console.log(`✅ Fetched accurate ${market} price for ${symbol}:`, priceData);
      } catch (error: any) {
        console.error(`❌ Price fetching error for ${symbol}:`, error.message);
        return res.status(400).json({ 
          error: `Unable to fetch price data for symbol "${symbol}". Please verify the symbol is correct for ${market} market.` 
        });
      }

      // 🎯 STEP 2: Perform analysis using Perplexity with pre-fetched prices
      const analysisResult = await analyzeMarketWithPerplexity(symbol, duration, market, user.language, priceData);

      // Save analysis with Perplexity-validated metadata (including auto-detected market)
      const analysis = await storage.createAnalysis({
        userId,
        symbol, // Original user-entered symbol (may be misspelled)
        correctedSymbol: analysisResult.correctedSymbol, // Perplexity-corrected symbol
        assetName: analysisResult.assetName, // Perplexity-validated full name
        instrumentName: analysisResult.instrumentName, // For backward compatibility
        currentPrice: analysisResult.currentPrice, // DEPRECATED: Use candleClosePrice instead
        livePrice: analysisResult.livePrice, // Actual current live market price
        candleClosePrice: analysisResult.candleClosePrice, // Price at closed candle for analysis
        priceSource: analysisResult.priceSource, // Where Perplexity found the price
        candleCloseTime: analysisResult.candleCloseTime, // Timestamp of candle close
        timeframe: analysisResult.timeframe, // Candle timeframe (e.g., "15min", "1hr", "1day")
        nextCandleCloseTime: analysisResult.nextCandleCloseTime, // When next candle closes
        duration,
        market: analysisResult.marketType as "stock_equities" | "commodity" | "forex" | "derivatives_futures" | "bond" | "cryptocurrency", // Auto-detected by Perplexity
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

  const httpServer = createServer(app);

  return httpServer;
}
