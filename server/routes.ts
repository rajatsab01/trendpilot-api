/**
 * TrendPilot API Routes
 * ---------------------
 * Render-safe + Phone.Email external approval compatible
 */

import { Router, Request, Response } from "express";

const router = Router();

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */
async function fetchWithTimeout(url: string, ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* --------------------------------------------------
   Health
-------------------------------------------------- */
router.get(["/healthz", "/api/healthz"], (_req, res) => {
  res.status(200).send("OK");
});

/* --------------------------------------------------
   Version
-------------------------------------------------- */
router.get(["/version", "/api/version"], (_req, res) => {
  res.json({
    version: "1.0.0",
    service: "TrendPilot API",
    status: "active",
  });
});

/* --------------------------------------------------
   Phone Verification (Phone.Email)
-------------------------------------------------- */
router.post(
  ["/auth/verify-phone", "/api/auth/verify-phone"],
  async (req: Request, res: Response) => {
    try {
      const { userJsonUrl, phoneNumber } = req.body || {};

      /* ---- Case 1: phone already sent ---- */
      if (typeof phoneNumber === "string" && phoneNumber.trim()) {
        const digits = phoneNumber.replace(/[^\d]/g, "");
        if (digits.length < 10) {
          return res.status(400).json({
            success: false,
            message: "Invalid phone number",
            received: phoneNumber,
          });
        }

        const normalized = `+${digits}`;
        console.log("✅ Phone verified (direct):", normalized);
        return res.json({ success: true, phoneNumber: normalized });
      }

      /* ---- Case 2: Phone.Email callback URL ---- */
      if (!userJsonUrl || typeof userJsonUrl !== "string") {
        return res.status(400).json({
          success: false,
          message: "Missing userJsonUrl from Phone.Email",
        });
      }

      console.log("🔗 Fetching Phone.Email JSON:", userJsonUrl);

      const resp = await fetchWithTimeout(userJsonUrl);
      if (!resp.ok) {
        return res.status(400).json({
          success: false,
          message: "Phone.Email fetch failed",
          status: resp.status,
        });
      }

      const data: any = await resp.json();

      const raw =
        data?.phone_email?.phone_number ||
        data?.phone_number ||
        data?.phone ||
        data?.user?.phone_number;

      if (!raw || typeof raw !== "string") {
        return res.status(400).json({
          success: false,
          message: "Phone number not found in Phone.Email payload",
        });
      }

      const digits = raw.replace(/[^\d]/g, "");
      if (digits.length < 10) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone received from Phone.Email",
          raw,
        });
      }

      const normalized = `+${digits}`;
      console.log("✅ Phone verified (Phone.Email):", normalized);

      return res.json({
        success: true,
        phoneNumber: normalized,
      });
    } catch (err: any) {
      console.error("❌ verify-phone error:", err);
      return res.status(500).json({
        success: false,
        message: "Phone verification failed",
      });
    }
  }
);

/* --------------------------------------------------
   Login
-------------------------------------------------- */
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

      res.json({
        success: true,
        userId,
        name,
        mobile,
        language,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: "Login failed" });
    }
  }
);

/* --------------------------------------------------
   404
-------------------------------------------------- */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.path,
  });
});

export default router;
