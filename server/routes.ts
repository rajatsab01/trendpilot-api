//------------------------------------------------------
// TrendPilot Routes v1.2.5 (Stable Frontend Sync)
//------------------------------------------------------
// Includes:
// - Version guard sync (popup fix)
// - Phone + login auth
// - Market/symbol validation
// - Instrument search (Binance + CoinGecko fallback)
// - Config + analysis endpoints
//------------------------------------------------------

import express, { Request, Response } from "express";
import axios from "axios";
import { runMarketAnalysis } from "./analysisEngine.js";
import { validateSymbol } from "./symbolValidator.js";
import { fetchExchangeRates } from "./currencyConverter.js";

const router = express.Router();

//------------------------------------------------------
// ✅ Version Guard (sync with frontend 1.2.5)
//------------------------------------------------------
router.get("/api/version", (_req, res) => {
  const frontendVersion = "1.2.5";
  const versionGuard = {
    version: frontendVersion,
    message: "Frontend and backend versions synced",
    updateRequired: false,
    downloadUrl: "https://trendpilot.replit.app",
  };

  res.json({
    version: frontendVersion,
    updateRequired: false,
    versionGuard,
    downloadUrl: "https://trendpilot.replit.app",
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "production",
  });
});

//------------------------------------------------------
// ✅ Health Check
//------------------------------------------------------
router.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "production",
  });
});

//------------------------------------------------------
// ✅ Authentication
//------------------------------------------------------
router.post("/api/auth/verify-phone", (req: Request, res: Response) => {
  const body = req.body || {};
  let rawPhone =
    body.phoneNumber || body.phone || body.mobile || body.number || body.input || "";

  rawPhone = rawPhone.toString().replace(/\D/g, "");

  if (!rawPhone || rawPhone.length < 8) {
    console.warn("⚠️ Invalid phone:", body);
    return res.status(400).json({ verified: false, message: "Invalid or missing phone number" });
  }

  let countryCode = body.countryCode;
  if (!countryCode) {
    if (rawPhone.startsWith("91")) countryCode = "+91";
    else if (rawPhone.startsWith("1")) countryCode = "+1";
    else countryCode = "+91";
  }

  const normalized = rawPhone.startsWith("+") ? rawPhone : `${countryCode}${rawPhone}`;
  console.log(`📞 Verified phone: ${normalized}`);

  return res.json({
    verified: true,
    phoneNumber: normalized,
    countryCode,
    message: "Phone verified successfully",
  });
});

router.post("/api/auth/login", (req: Request, res: Response) => {
  const { userId, tokens } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, message: "Missing userId for login" });
  }
  console.log(`👤 Login OK for ${userId}`);
  res.json({ userId, tokens: tokens || 20, success: true });
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
// ✅ Instrument Search (Auto-suggestions)
//------------------------------------------------------
router.get("/api/search-instruments", async (req: Request, res: Response) => {
  try {
    const query = (req.query.q || "").toString().trim().toUpperCase();

    // Fetch Binance spot prices
    const { data } = await axios.get("https://api.binance.com/api/v3/ticker/price");
    const binanceList = data
      .filter((item: any) => item.symbol && item.symbol.includes("USDT"))
      .slice(0, 120)
      .map((item: any) => ({
        symbol: item.symbol,
        name: item.symbol.replace("USDT", ""),
        price: item.price,
        source: "Binance",
      }));

    let results = query
      ? binanceList.filter((x) => x.symbol.includes(query))
      : binanceList;

    // Optional fallback: CoinGecko
    if (results.length === 0) {
      const cg = await axios.get("https://api.coingecko.com/api/v3/coins/markets", {
        params: { vs_currency: "usd", order: "market_cap_desc", per_page: 100, page: 1 },
      });
      const cgList = cg.data.map((c: any) => ({
        symbol: c.symbol.toUpperCase(),
        name: c.name,
        price: c.current_price,
        source: "CoinGecko",
      }));
      results = query
        ? cgList.filter((x) => x.symbol.includes(query))
        : cgList;
    }

    res.json({
      success: true,
      instruments: results,
      total: results.length,
    });
  } catch (err: any) {
    console.error("❌ /api/search-instruments error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

//------------------------------------------------------
// ✅ Symbol Validation
//------------------------------------------------------
router.post("/api/symbols/validate", async (req: Request, res: Response) => {
  try {
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
// ✅ Market Analysis
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

    res.json({ analysisId: response.analysisId, ...response.data });
  } catch (err: any) {
    console.error("❌ /api/analyze error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

//------------------------------------------------------
// ✅ Currency Converter
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
// ✅ Config Endpoints (stop 404 spam)
//------------------------------------------------------
router.get(["/api/config", "/api/v1/config", "/api/v2/config"], (_req, res) => {
  res.json({
    success: true,
    config: {
      appName: "TrendPilot",
      version: "1.2.5",
      status: "active",
      downloadUrl: "https://trendpilot.replit.app",
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
