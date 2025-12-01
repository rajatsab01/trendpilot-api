// server/routes.ts
//------------------------------------------------------
// TrendPilot Routes v2.8 (Dec-2025 build)
//------------------------------------------------------
// Handles all /api endpoints with new analysis pipeline.
//------------------------------------------------------

import express, { Request, Response } from "express";
import { runMarketAnalysis } from "./analysisEngine.js";
import { validateSymbol } from "./symbolValidator.js";
import { fetchExchangeRates } from "./currencyConverter.js";

const router = express.Router();

//------------------------------------------------------
// ✅ Health + Version
//------------------------------------------------------
router.get("/api/version", (_req, res) => {
  res.json({ version: "1.2.8", updateRequired: false });
});

router.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

//------------------------------------------------------
// ✅ Symbol validation
//------------------------------------------------------
router.post("/api/symbols/validate", async (req: Request, res: Response) => {
  try {
    console.log("📥 [/api/symbols/validate] Received:", req.body);
    const { symbol, market } = req.body;

    if (!symbol || !market)
      return res.status(400).json({ isValid: false, message: "Missing symbol or market" });

    const result = await validateSymbol(symbol, market);
    if (!result.isValid)
      return res.status(400).json({ isValid: false, message: "Invalid symbol" });

    res.json({
      isValid: true,
      correctedSymbol: result.correctedSymbol,
      assetName: result.assetName,
      currentPrice: result.currentPrice || 0,
      exchange: result.exchange || "auto",
    });
  } catch (err: any) {
    console.error("❌ Symbol validate error:", err);
    res.status(500).json({ isValid: false, message: err.message });
  }
});

//------------------------------------------------------
// ✅ Market analysis endpoint
//------------------------------------------------------
router.post("/api/analyze", async (req: Request, res: Response) => {
  try {
    const { symbol, market, language, duration, userCountry } = req.body;

    if (!symbol || !market || !duration)
      return res.status(400).json({ success: false, message: "Missing required fields" });

    console.log("🌐 Running analysis:", symbol, market, duration);

    const response = await runMarketAnalysis({
      symbol,
      market,
      language: language || "en",
      duration: duration || "short_term",
      userCountry,
    });

    if (!response.success)
      return res.status(500).json({ success: false, message: "Analysis failed" });

    res.json({
      analysisId: response.analysisId,
      ...response.data,
    });
  } catch (err: any) {
    console.error("❌ /api/analyze error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

//------------------------------------------------------
// ✅ Currency converter helper
//------------------------------------------------------
router.get("/api/rates", async (_req: Request, res: Response) => {
  try {
    const rates = await fetchExchangeRates();
    res.json({ success: true, rates });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

//------------------------------------------------------
// ✅ Fallback route for API mismatch
//------------------------------------------------------
router.all("/api/*", (_req, res) => {
  res.status(404).json({ success: false, message: "Endpoint not found" });
});

//------------------------------------------------------
export function registerRoutes(app: express.Application) {
  app.use(router);
  console.log("✅ TrendPilot routes registered");
}
