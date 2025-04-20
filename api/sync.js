// /api/sync.js — v2.1.0 (JWT + jti через verifyAccessToken)
const express = require("express");
const supabase = require("../lib/supabase");
const verifyAccessToken = require("../lib/verifyAccessToken"); // ✅

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    console.log("📥 [SYNC] POST /api/sync called");

    const payload = await verifyAccessToken(req); // ✅ telegram_id + jti валидны
    const telegram_id = payload.telegram_id;

    // Получаем профиль пользователя
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegram_id)
      .single();

    if (userError || !user) {
      console.warn("⚠️ User not found in Supabase:", userError?.message);
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
      isEarlyAccess: !!user.isEarlyAccess,
    });

  } catch (err) {
    console.error("❌ JWT ошибка в /api/sync:", err.message);
    return res.status(401).json({ error: err.message });
  }
});

module.exports = router;
