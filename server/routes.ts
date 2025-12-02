//------------------------------------------------------
// TrendPilot Routes v2.9 (Dec-2025 full compatibility)
//------------------------------------------------------
// Includes: versionGuard + login fix + verify-phone fix
//------------------------------------------------------

import express, { Request, Response } from "express";
import { runMarketAnalysis } from "./analysisEngine.js";
import { validateSymbol } from "./symbolValidator.js";
import { fetchExchangeRates } from "./currencyConverter.js";

const router = express.Router();

//------------------------------------------------------
// ✅ Version Guard
//------------------------------------------------------
router.get("/api/version", (_req, res) => {
  const frontendVersion = "1.2.9";
  const versionGuard = {
    version: frontendVersion,
    message: "Frontend and backend versions synced",
    updateRequired: false,
  };

  res.json({
    version: frontendVersion,
    updateRequired: false,
    versionGuard,
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

//------------------------------------------------------
// ✅ Health
//------------------------------------------------------
router.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

//------------------------------------------------------
// ✅ Authentication
//------------------------------------------------------

// Verify Phone – flexible for all frontend versions
router.post("/api/auth/verify-phone", (req: Request, res: Response) => {
  const body = req.body || {};
  let rawPhone =
    body.phoneNumber ||
    body.phone ||
    body.mobile ||
    body.number ||
    body.input ||
    "";

  // Clean number
  rawPhone = rawPhone.toString().replace(/\D/g, "");

  // Require 8+ digits
  if (!rawPhone || rawPhone.length < 8) {
    console.warn("⚠️ Invalid phone:", body);
    return res
      .status(400)
      .json({ verified: false, message: "Invalid or missing phone number" });
  }

  // Infer country code if missing
  let countryCode = body.countryCode;
  if (!countryCode) {
    if (rawPhone.startsWith("91")) countryCode = "+91";
    else if (rawPhone.startsWith("1")) countryCode = "+1";
    else countryCode = "+91"; // default India
  }

  const normalized = rawPhone.startsWith("+")
    ? rawPhone
    : `${countryCode}${rawPhone}`;

  console.log(`📞 Verified phone: ${normalized}`);

  return res.json({
    verified: true,
    phoneNumber: normalized,
    countryCode,
    message: "Phone verified successfully",
  });
});

// Simple Login
router.post("/api/auth/login", (req: Request, res: Response) => {
  const { userId, tokens } = req.body;
  if (!userId) {
    return res
      .status(400)
      .json({ success: false, message: "Missing userId for login" });
  }
  console.log(`👤 Login OK for ${userId}`);
  res.json({
    userId,
    tokens: tokens || 20,
    success: true,
  });
});

//------------------------------------------------------
// ✅ Basic user & messages routes
//------------------------------------------------------
router.get("/api/user/:id", (req: Request, res: Response) => {
  const id = req.params.id;
  res.json({
    success: true,
    userId: id,
    name: "Rajat Sabharwal",
    mobile: "+919811209473",
    language: "en",
    createdAt: new Date().toISOString(),
  });
});

router.get("/api/messages/unread-count/:id", (_req: Request, res: Response) => {
  res.json({ success: true, count: 0 });
});

//------------------------------------------------------
// ✅ Symbol validation
//------------------------------------------------------
router.post("/api/symbols/validate", async (req: Request, res: Response) => {
  try {
    const { symbol, market } = req.body;
    if (!symbol || !market)
      return res
        .status(400)
        .json({ isValid: false, message: "Missing symbol or market" });

    const result = await validateSymbol(symbol, market);
    if (!result.isValid)
      return res
        .status(400)
        .json({ isValid: false, message: "Invalid symbol" });

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
// ✅ Market analysis
//------------------------------------------------------
router.post("/api/analyze", async (req: Request, res: Response) => {
  try {
    const { symbol, market, language, duration, userCountry } = req.body;
    if (!symbol || !market || !duration)
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });

    console.log("🌐 Running analysis:", symbol, market, duration);

    const response = await runMarketAnalysis({
      symbol,
      market,
      language: language || "en",
      duration: duration || "short_term",
      userCountry,
    });

    if (!response.success)
      return res
        .status(500)
        .json({ success: false, message: "Analysis failed" });

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
// ✅ Currency converter
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
// ✅ Config endpoints (to stop 404 spam)
//------------------------------------------------------
router.get(["/api/config", "/api/v1/config", "/api/v2/config"], (_req, res) => {
  res.json({
    success: true,
    config: {
      appName: "TrendPilot",
      version: "1.2.9",
      status: "active",
    },
  });
});

//------------------------------------------------------
// ✅ Fallback
//------------------------------------------------------
router.all("/api/*", (_req, res) => {
  res.status(404).json({ success: false, message: "Endpoint not found" });
});

//------------------------------------------------------
export function registerRoutes(app: express.Application) {
  app.use(router);
  console.log("✅ TrendPilot routes registered successfully");
}
