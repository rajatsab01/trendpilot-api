/**
 * TrendPilot API Routes
 * ---------------------
 * FINAL, STABLE, Phone.Email–compatible
 */

import { Router, Request, Response } from "express";

const router = Router();

/* ---------------------------------------
   Utils
--------------------------------------- */
async function fetchWithTimeout(url: string, ms = 15000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/* ---------------------------------------
   Health
--------------------------------------- */
router.get(["/healthz", "/api/healthz"], (_req, res) => {
  res.status(200).send("OK");
});

/* ---------------------------------------
   Version
--------------------------------------- */
router.get(["/version", "/api/version"], (_req, res) => {
  res.json({
    service: "TrendPilot API",
    version: "1.2.25",
    status: "active",
  });
});

/* ---------------------------------------
   PHONE VERIFICATION (Phone.Email)
--------------------------------------- */
router.post(
  ["/auth/verify-phone", "/api/auth/verify-phone"],
  async (req: Request, res: Response) => {
    try {
      const { userJsonUrl, phoneNumber } = req.body || {};

      // ✅ Case 1: Direct phone (some countries/configs)
      if (typeof phoneNumber === "string" && phoneNumber.trim()) {
        const cleaned = phoneNumber.replace(/[^\d]/g, "");
        const normalized = `+${cleaned}`;

        console.log("✅ Phone verified (direct):", normalized);

        return res.json({
          success: true,
          phoneNumber: normalized,
        });
      }

      // ✅ Case 2: Phone.Email external approval
      if (!userJsonUrl || typeof userJsonUrl !== "string") {
        return res.status(400).json({
          success: false,
          message: "Phone.Email callback missing userJsonUrl",
        });
      }

      console.log("🔗 Fetching Phone.Email JSON:", userJsonUrl);

      const response = await fetchWithTimeout(userJsonUrl);
      if (!response.ok) {
        return res.status(400).json({
          success: false,
          message: "Failed to fetch Phone.Email data",
        });
      }

      const data: any = await response.json();

      const rawPhone =
        data?.phone_email?.phone_number ||
        data?.phone_number ||
        data?.phone ||
        data?.user?.phone_number;

      if (!rawPhone) {
        return res.status(400).json({
          success: false,
          message: "Phone number not found in Phone.Email payload",
        });
      }

      const normalized = `+${rawPhone.replace(/[^\d]/g, "")}`;

      console.log("✅ Phone verified (Phone.Email):", normalized);

      return res.json({
        success: true,
        phoneNumber: normalized,
      });
    } catch (err) {
      console.error("❌ verify-phone error:", err);
      return res.status(500).json({
        success: false,
        message: "Phone verification failed",
      });
    }
  }
);

/* ---------------------------------------
   LOGIN
--------------------------------------- */
router.post(
  ["/auth/login", "/api/auth/login"],
  async (req: Request, res: Response) => {
    try {
      const { name, mobile, language } = req.body || {};

      if (!name || !mobile) {
        return res.status(400).json({
          success: false,
          message: "Missing name or mobile",
        });
      }

      const userId = `${mobile}-${Date.now()}`;

      console.log(`✅ Login success: ${name} (${mobile})`);

      return res.json({
        success: true,
        userId,
        name,
        mobile,
        language,
      });
    } catch (err) {
      console.error("❌ login error:", err);
      return res.status(500).json({
        success: false,
        message: "Login failed",
      });
    }
  }
);

/* ---------------------------------------
   404
--------------------------------------- */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.path,
  });
});

export default router;
