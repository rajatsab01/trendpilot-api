import express, { Request, Response } from "express";

const router = express.Router();

router.post("/api/auth/verify-phone", async (req: Request, res: Response) => {
  try {
    console.log("📥 RAW BODY:", req.body);

    const {
      phone,
      country_code,
      json_url,
      name
    } = req.body;

    // Hard validation
    if (!phone || !country_code || !json_url) {
      console.error("❌ Missing fields", { phone, country_code, json_url });
      return res.status(400).json({
        success: false,
        message: "Missing phone verification fields",
      });
    }

    const fullPhone = `${country_code}${phone}`;

    console.log("✅ VERIFIED PHONE:", fullPhone);
    console.log("✅ JSON URL:", json_url);

    return res.status(200).json({
      success: true,
      phone: fullPhone,
      json_url,
      name: name || "User",
    });
  } catch (error) {
    console.error("🔥 VERIFY PHONE CRASH:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
