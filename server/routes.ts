/**
 * TrendPilot API Routes
 * ---------------------
 * Stable & simplified auth flow (Render-safe)
 */

import { Router, Request, Response } from "express";

const router = Router();

/* --------------------------------------------------
   🩺 Health Check (Render)
-------------------------------------------------- */
router.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).send("OK");
});

/* --------------------------------------------------
   📦 API Version
-------------------------------------------------- */
router.get("/api/version", (_req: Request, res: Response) => {
  res.json({
    version: "1.0.0",
    service: "TrendPilot API",
    status: "active",
  });
});

/* --------------------------------------------------
   📱 Phone Verification (STABLE + BACKWARD SAFE)
-------------------------------------------------- */
router.post("/api/auth/verify-phone", async (req: Request, res: Response) => {
  try {
    let { phoneNumber } = req.body;

    // 🔁 Backward compatibility (Phone.Email flow)
    if (!phoneNumber && req.body?.userJsonUrl) {
      console.warn("⚠️ userJsonUrl received but ignored (legacy flow)");
      return res.status(400).json({
        success: false,
        message: "Phone number missing",
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number missing",
      });
    }

    // Basic E.164 validation
    if (!/^\+\d{10,15}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    console.log("✅ Phone verified:", phoneNumber);

    return res.status(200).json({
      success: true,
      phoneNumber,
    });
  } catch (error: any) {
    console.error("❌ verify-phone error:", error);
    return res.status(500).json({
      success: false,
      message: "Phone verification failed",
    });
  }
});

/* --------------------------------------------------
   👤 Login
-------------------------------------------------- */
router.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { name, mobile, language } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({
        success: false,
        message: "Missing name or mobile number",
      });
    }

    const userId = `${mobile}-${Date.now()}`;

    console.log(`✅ Login success: ${name} (${mobile})`);

    return res.status(200).json({
      success: true,
      userId,
      name,
      mobile,
      language,
    });
  } catch (error: any) {
    console.error("❌ login error:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

/* --------------------------------------------------
   ⚙️ Email Placeholder
-------------------------------------------------- */
router.post("/api/auth/verify-email", async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false });
  }

  return res.json({
    success: true,
    email,
  });
});

/* --------------------------------------------------
   ❌ 404
-------------------------------------------------- */
router.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

export default router;
