/**
 * TrendPilot API Routes
 * ---------------------
 * Central router for all API endpoints.
 */

import { Router, Request, Response } from "express";

const router = Router();

// ------------------------------------------------------
// 🩺 Health Check (Render)
// ------------------------------------------------------
router.get("/healthz", (_req, res) => {
  res.status(200).send("OK");
});

// ------------------------------------------------------
// 📦 API Version
// ------------------------------------------------------
router.get("/api/version", (_req, res) => {
  res.json({
    version: "1.0.0",
    service: "TrendPilot API",
    status: "active",
  });
});

// ------------------------------------------------------
// 📱 Phone Verification (Phone.Email)
// ------------------------------------------------------
router.post("/api/auth/verify-phone", async (req: Request, res: Response) => {
  try {
    const { userJsonUrl } = req.body;

    if (!userJsonUrl) {
      return res.status(400).json({
        success: false,
        message: "Missing userJsonUrl",
      });
    }

    console.log("🔐 Phone verification URL:", userJsonUrl);

    const response = await fetch(userJsonUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.error("❌ Phone.Email bad response:", response.status);
      return res.status(401).json({
        success: false,
        message: "Phone verification failed",
      });
    }

    const data = await response.json();
    console.log("📦 Phone.Email response:", data);

    const phone =
      data?.phone_email?.phone_number ||
      data?.phone_number ||
      data?.phone ||
      null;

    if (!phone) {
      console.error("❌ Phone missing in response");
      return res.status(401).json({
        success: false,
        message: "Phone not verified",
      });
    }

    console.log("✅ Phone verified:", phone);

    return res.status(200).json({
      success: true,
      phoneNumber: phone,
    });
  } catch (err: any) {
    console.error("❌ verify-phone error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Verification service unavailable",
    });
  }
});

// ------------------------------------------------------
// 👤 Login
// ------------------------------------------------------
router.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { name, mobile, language } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({
        success: false,
        message: "Missing name or mobile",
      });
    }

    const userId = `${mobile}-${Date.now()}`;

    console.log(`✅ Login: ${name} | ${mobile} | ${language}`);

    return res.status(200).json({
      success: true,
      userId,
      name,
      mobile,
      language,
    });
  } catch (err: any) {
    console.error("❌ login error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

// ------------------------------------------------------
// 📧 Email verification placeholder
// ------------------------------------------------------
router.post("/api/auth/verify-email", async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email required",
    });
  }

  console.log("📧 Email verification:", email);

  return res.status(200).json({
    success: true,
    email,
  });
});

// ------------------------------------------------------
// ❌ 404
// ------------------------------------------------------
router.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

export default router;
