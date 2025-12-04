/**
 * TrendPilot API Routes
 * ---------------------
 * Central router for all API endpoints.
 * Includes: health check, version info, phone verification, and login.
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
// 📦 API Version Info
// ------------------------------------------------------
router.get("/api/version", (_req: Request, res: Response) => {
  res.json({
    version: "1.0.0",
    service: "TrendPilot API",
    status: "active",
  });
});

// ------------------------------------------------------
// 📱 Phone Verification via Phone.Email
// ------------------------------------------------------
router.post("/api/auth/verify-phone", async (req: Request, res: Response) => {
  try {
    const { userJsonUrl } = req.body;

    if (!userJsonUrl) {
      return res.status(400).json({ success: false, message: "Missing userJsonUrl" });
    }

    const response = await fetch(userJsonUrl);
    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const data = await response.json();

    // Extract phone number from multiple possible keys
    const phone =
      data.phone_email?.phone_number ||
      data.phone_number ||
      data.phone ||
      null;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing phone number in user JSON",
      });
    }

    // ✅ Send verified phone number back to client
    return res.status(200).json({
      success: true,
      phoneNumber: phone,
    });
  } catch (error: any) {
    console.error("❌ verify-phone error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify phone",
      error: error.message || "Unknown error",
    });
  }
});

// ------------------------------------------------------
// 👤 Login Route
// ------------------------------------------------------
router.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { name, mobile, language } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({
        success: false,
        message: "Missing name or mobile number",
      });
    }

    // Example: in future you can connect this to DB (Firebase / Mongo)
    const fakeUserId = `${mobile}-${Date.now()}`;

    console.log(`✅ User logged in: ${name} (${mobile}) [${language}]`);

    return res.status(200).json({
      success: true,
      userId: fakeUserId,
      name,
      mobile,
      language,
      message: "Login successful",
    });
  } catch (error: any) {
    console.error("❌ login error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete login",
      error: error.message || "Unknown error",
    });
  }
});

// ------------------------------------------------------
// ⚙️ Optional Email verification placeholder
// ------------------------------------------------------
router.post("/api/auth/verify-email", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

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
