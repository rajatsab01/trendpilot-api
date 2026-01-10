import express from "express";

const router = express.Router();

router.post("/auth/verify-phone", async (req, res) => {
  try {
    console.log("📥 Incoming verify-phone body:", req.body);

    const { user_phone_number, user_country_code, user_json_url } = req.body;

    if (!user_phone_number || !user_country_code || !user_json_url) {
      console.error("❌ Missing fields:", req.body);
      return res.status(400).json({
        success: false,
        message: "Invalid phone verification payload",
      });
    }

    const fullPhone = `${user_country_code}${user_phone_number}`;

    console.log("✅ Verified phone:", fullPhone);
    console.log("📄 JSON URL:", user_json_url);

    return res.json({
      success: true,
      phone: fullPhone,
      json_url: user_json_url,
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
