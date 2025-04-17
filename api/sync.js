// /api/sync.js — v2.0.0
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

    // Получаем профиль
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegram_id)
      .single();

    if (userError || !user) {
      console.warn("⚠️ User not found in Supabase:", userError);
      return res.status(404).json({ error: "User not found" });
    }

    // Получаем активность за сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: activity, error: activityError } = await supabase
      .from("user_activity")
      .select("*")
      .eq("telegram_id", telegram_id)
      .gte("date", today.toISOString())
      .order("date", { ascending: false })
      .limit(1)
      .single();

    if (activityError) {
      console.warn("⚠️ Нет данных активности за сегодня:", activityError.message);
    }

    return res.status(200).json({
      steps: activity?.steps || 0,
      stepsGoal: 10000,
      calories: activity?.calories || 0,
      caloriesGoal: 2000,
      minutes: activity?.active_minutes || 0,
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
