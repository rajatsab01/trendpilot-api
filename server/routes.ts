/**
 * TrendPilot API Routes
 * ---------------------
 * Central router for all API endpoints.
 * Includes: health check, version info, and authentication routes.
 */

import { Router, Request, Response } from "express";

const router = Router();

// ------------------------------------------------------
// 🩺 Health Check (used by Render for uptime monitoring)
// ------------------------------------------------------
router.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).send("OK");
});

// ------------------------------------------------------
// 📦 API Version
// ------------------------------------------------------
router.get("/api/version", (_req: Request, res: Response) => {
  res.json({
    version: "1.0.0",
    service: "TrendPilot API",
    status: "active",
  });
});

// ------------------------------------------------------
// 📱 Phone Verification (production placeholder)
// ------------------------------------------------------
// NOTE: Connect your real verification service here.
// e.g., Twilio, Firebase Auth, or your custom OTP logic.

router.post("/api/auth/verify-phone", async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    // 🧩 Example integration (replace with your actual service)
    // await sendOtpToPhone(phone);

    // Respond success (for now, simple confirmation)
    return res.status(200).json({
      success: true,
      message: "Verification request received",
      phone,
    });
  } catch (error: any) {
    console.error("❌ Phone verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during phone verification",
      error: error.message || "Unknown error",
    });
  }
});

// ------------------------------------------------------
// ⚙️ Optional: Email verification placeholder
// ------------------------------------------------------
router.post("/api/auth/verify-email", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // e.g., await sendEmailVerification(email);

    return res.status(200).json({
      success: true,
      message: "Email verification initiated",
      email,
    });
  } catch (error: any) {
    console.error("❌ Email verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during email verification",
      error: error.message || "Unknown error",
    });
  }
});

// ------------------------------------------------------
// 🧠 Default 404 for undefined API routes
// ------------------------------------------------------
router.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "API route not found" });
});

export default router;
