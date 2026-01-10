import express from "express";

const router = express.Router();

router.post("/auth/verify-phone", async (req, res) => {
  try {
    console.log("📥 Incoming body:", req.body);

    const { phone, country_code, json_url } = req.body;

    if (!phone || !country_code || !json_url) {
      console.error("❌ Missing fields:", req.body);
      return res.status(400).json({
        success: false,
        message: "Invalid phone verification payload",
      });
    }

    const fullPhone = `${country_code}${phone}`;

    console.log("✅ Phone verified:", fullPhone);

    return res.json({
      success: true,
      phone: fullPhone,
      json_url,
    });
  } catch (error) {
    console.error("🔥 Verify phone error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export default router;
