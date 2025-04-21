const express = require("express");
const supabase = require("../lib/supabase");
const verifyAccessToken = require("../lib/verifyAccessToken");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    console.log("📥 [SYNC] POST /api/sync");

    const payload = await verifyAccessToken(req);
    const telegram_id = payload.telegram_id;

    // Получаем профиль пользователя
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegram_id)
      .single();

    if (userError || !user) {
      console.warn("⚠️ Пользователь не найден:", userError?.message);
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
      console.warn("⚠️ Нет данных активности:", activityError.message);
    }

    // Метрики активности (с fallback)
    const steps = activity?.steps ?? 0;
    const calories = activity?.calories ?? 0;
    const distance = activity?.distance ?? 0; // в метрах
    const minutes = activity?.active_minutes ?? 0;

    // Статус пользователя
    const hasNFT = Boolean(user.hasNFT);
    const isPremium = Boolean(user.is_premium);
    const isEarlyAccess = Boolean(user.isEarlyAccess);

    return res.status(200).json({
      ok: true,
      steps,
      stepsGoal: 10000,
      calories,
      caloriesGoal: 2000,
      distance, // в метрах
      distanceGoal: 5, // в км
      minutes,
      hasNFT,
      isPremium,
      isEarlyAccess,
    });
  } catch (err) {
    console.error("❌ Ошибка /api/sync:", err.message);
    return res.status(401).json({ error: err.message });
  }
});

module.exports = router;
