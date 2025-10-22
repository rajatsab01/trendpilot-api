import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeMarket } from "./gemini";
import { z } from "zod";
import { insertUserSchema, insertBrokerSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth/Login - creates or retrieves user
  app.post("/api/auth/login", async (req, res) => {
    try {
      // Validate request body
      const validationResult = insertUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const { name, mobile, language } = validationResult.data;

      // Check if user exists by mobile
      let user = await storage.getUserByMobile(mobile);

      if (!user) {
        // Create new user
        user = await storage.createUser({
          name,
          mobile,
          language,
          tokens: 100,
        });
      }

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

  // Analyze market symbol
  app.post("/api/analyze", async (req, res) => {
    try {
      // Validate request body
      const analyzeSchema = z.object({
        userId: z.string().min(1),
        symbol: z.string().min(1),
        duration: z.enum(["long_term", "short_term", "scalping"]),
      });

      const validationResult = analyzeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: validationResult.error.errors[0].message });
      }

      const { userId, symbol, duration } = validationResult.data;

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

      // Perform analysis using Gemini AI
      const analysisResult = await analyzeMarket(symbol, duration);

      // Save analysis
      const analysis = await storage.createAnalysis({
        userId,
        symbol,
        duration,
        recommendation: analysisResult.recommendation,
        confidence: analysisResult.confidence,
        sentiment: analysisResult.sentiment,
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

      const { userId, name, apiKey, webhookUrl } = validationResult.data;

      const broker = await storage.createBroker({
        userId,
        name,
        apiKey: apiKey || null,
        webhookUrl: webhookUrl || null,
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
