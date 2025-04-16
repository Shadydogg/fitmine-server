// sync.js — v1.5.1 (Express Router + JWT)
const express = require("express");
const jwt = require("jsonwebtoken");
const supabase = require("../lib/supabase");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "fitmine_super_secret";

router.post("/", async (req, res) => {
  try {
    console.log("📥 [SYNC] POST /api/sync called");

    const authHeader = req.headers.authorization || "";
    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    let telegram_id;
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      telegram_id = payload.telegram_id;
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegram_id)
      .single();

    if (error || !user) {
      console.warn("⚠️ User not found in Supabase:", error);
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      steps: user.steps || 0,
      stepsGoal: 10000,
      calories: user.calories || 0,
      caloriesGoal: 500,
      minutes: user.minutes || 0,
      hasNFT: !!user.hasNFT,
      isPremium: !!user.is_premium,
      isEarlyAccess: !!user.isEarlyAccess
    });

  } catch (err) {
    console.error("❌ Ошибка в /api/sync:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
});

module.exports = router;
