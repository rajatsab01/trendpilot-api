import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeMarket } from "./gemini";
import { analyzeMarketWithOpenAI } from "./openai";
import { z } from "zod";
import { insertUserSchema, insertBrokerSchema } from "@shared/schema";

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
      const Razorpay = require("razorpay");
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const order = await razorpay.orders.create({
        amount: selectedPackage.amount, // amount in paise
        currency: "INR",
        receipt: `receipt_${userId}_${Date.now()}`,
        notes: {
          userId,
          tokens: selectedPackage.tokens,
        },
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

      const crypto = require("crypto");
      const body = orderId + "|" + paymentId;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: "Invalid payment signature" });
      }

      // Payment verified - add tokens
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

  // Analyze market symbol
  app.post("/api/analyze", async (req, res) => {
    try {
      // Validate request body
      const analyzeSchema = z.object({
        userId: z.string().min(1),
        symbol: z.string().min(1),
        duration: z.enum(["long_term", "short_term", "scalping"]),
        market: z.enum(["crypto", "indian_nse", "indian_bse", "us", "japan", "singapore", "currency"]),
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

      // Deduct tokens
      await storage.updateUserTokens(userId, user.tokens - 2);

      // Perform analysis using OpenAI with real market data (use user's language)
      const analysisResult = await analyzeMarketWithOpenAI(symbol, duration, market, user.language);

      // Save analysis
      const analysis = await storage.createAnalysis({
        userId,
        symbol,
        duration,
        market,
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
      });

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
