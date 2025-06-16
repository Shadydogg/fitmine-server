// /api/sync/index.js — v1.3.0
const express = require("express");
const supabase = require("../lib/supabase");
const verifyAccessToken = require("../lib/verifyAccessToken");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    console.log("📥 [SYNC] POST /api/sync");

    const payload = await verifyAccessToken(req);
    const telegram_id = payload.telegram_id;

    // 🧩 Получение профиля
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, is_premium")
      .eq("telegram_id", telegram_id)
      .single();

    if (userError || !user) {
      console.warn("⚠️ Пользователь не найден:", userError?.message);
      return res.status(404).json({ error: "User not found" });
    }

    const today = new Date().toISOString().slice(0, 10);

    // 📦 Активность
    const { data: activity, error: activityError } = await supabase
      .from("user_activity")
      .select("steps, calories, distance, active_minutes, ep, double_goal, ep_frozen")
      .eq("telegram_id", telegram_id)
      .eq("date", today)
      .maybeSingle();

    if (activityError) {
      console.warn("⚠️ Нет данных активности:", activityError.message);
    }

    const doubleGoal = activity?.double_goal || false;
    const multiplier = doubleGoal ? 2 : 1;

    // 📦 NFT
    const { data: nft, error: nftError } = await supabase
      .from("nft_miners")
      .select("id")
      .eq("telegram_id", telegram_id)
      .limit(1);

    // ⚡ PowerBanks
    const { data: powerbanks, error: pbError } = await supabase
      .from("user_powerbanks")
      .select("id")
      .eq("telegram_id", telegram_id)
      .eq("used", false);

    const powerbankCount = Array.isArray(powerbanks) ? powerbanks.length : 0;

    return res.status(200).json({
      ok: true,
      steps: activity?.steps || 0,
      stepsGoal: 10000 * multiplier,
      calories: activity?.calories || 0,
      caloriesGoal: 2000 * multiplier,
      distance: activity?.distance || 0,
      distanceGoal: 5 * multiplier,
      minutes: activity?.active_minutes || 0,
      minutesGoal: 45 * multiplier,
      ep: activity?.ep || 0,
      ep_frozen: activity?.ep_frozen || false,
      double_goal: doubleGoal,
      hasNFT: !!nft?.length,
      isPremium: !!user?.is_premium,
      powerbankCount,
    });

  } catch (err) {
    console.error("❌ /api/sync error:", err.message || err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;