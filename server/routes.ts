import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import { analyzeMarket } from "./analysisEngine";
import { convertCurrency } from "./currencyConverter";
import { getExchangeCurrency } from "./symbolValidator";
import { fetchPriceData } from "./priceData";

dotenv.config();

const app = express();
app.use(express.json());

// ------------------------ HEALTH CHECK ------------------------
app.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// ------------------------ VERIFY PHONE ------------------------
app.post("/api/auth/verify-phone", async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone || typeof phone !== "string") {
      return res.status(400).json({
        verified: false,
        message: "Phone number missing or invalid",
      });
    }

    const formattedPhone = phone.replace(/\D/g, "");
    if (formattedPhone.length < 8 || formattedPhone.length > 15) {
      return res.status(400).json({
        verified: false,
        message: "Invalid phone number format",
      });
    }

    // ✅ Local mock verification (replace with real API later if needed)
    console.log(`✅ Verified phone: ${formattedPhone}`);
    return res.status(200).json({
      verified: true,
      phoneNumber: formattedPhone,
    });
  } catch (err: any) {
    console.error("❌ Phone verification error:", err);
    return res.status(500).json({
      verified: false,
      message: "Verification failed. Please try again later.",
      error: err.message,
    });
  }
});

// ------------------------ ANALYSIS ROUTE ------------------------
app.post("/api/analyze", async (req: Request, res: Response) => {
  try {
    const { symbol, timeframe, hours, market } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: "Missing symbol" });
    }

    const priceData = await fetchPriceData(symbol, timeframe, hours, market);
    const analysis = await analyzeMarket(symbol, timeframe, hours, market);

    res.json({ success: true, analysis, priceData });
  } catch (error: any) {
    console.error("Error in /api/analyze:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ------------------------ SYMBOL VALIDATION ------------------------
app.post("/api/symbols/validate", async (req: Request, res: Response) => {
  try {
    const { symbol, market } = req.body;
    if (!symbol) return res.status(400).json({ error: "Symbol required" });

    const baseCurrency = getExchangeCurrency(symbol, market);
    res.status(200).json({ valid: true, symbol, baseCurrency });
  } catch (err: any) {
    res.status(400).json({ valid: false, message: err.message });
  }
});

// ------------------------ PRICE DATA ------------------------
app.get("/api/price-data", async (req: Request, res: Response) => {
  try {
    const { symbol, market } = req.query;
    if (!symbol) return res.status(400).json({ error: "Symbol required" });

    const data = await fetchPriceData(String(symbol), "1h", 24, String(market));
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ------------------------ CURRENCY CONVERSION ------------------------
app.post("/api/convert", async (req: Request, res: Response) => {
  try {
    const { amount, from, to } = req.body;
    if (!amount || !from || !to) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const result = await convertCurrency(amount, from, to);
    res.status(200).json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ------------------------ RAZORPAY ORDER CREATION ------------------------
app.post("/api/payment/order", async (req: Request, res: Response) => {
  try {
    const { amount, currency } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount required" });

    const Razorpay = require("razorpay");
    const razor = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razor.orders.create({
      amount: Number(amount) * 100,
      currency: currency || "INR",
    });

    res.status(200).json({ success: true, order });
  } catch (err: any) {
    console.error("Razorpay order error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------------ DEFAULT CATCH ------------------------
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

export default app;
