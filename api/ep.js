// /api/ep.js — v2.3.0 (расширенный ответ: double_goal, ep_frozen, claimed)
const verifyAccessToken = require("../lib/verifyAccessToken");
const supabase = require("../lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const user = await verifyAccessToken(req); // { telegram_id, jti }
    const telegram_id = user.telegram_id;
    const today = new Date().toISOString().slice(0, 10);

    // 📦 Получаем активность
    const { data: activity, error: activityError } = await supabase
      .from("user_activity")
      .select("ep, double_goal, ep_frozen")
      .eq("telegram_id", telegram_id)
      .eq("date", today)
      .maybeSingle();

    if (activityError) {
      console.error("❌ Supabase [user_activity] error:", activityError.message);
      return res.status(500).json({ error: "Supabase error", details: activityError.message });
    }

    // 🎁 Проверка награды
    const { data: reward, error: rewardError } = await supabase
      .from("powerbank_rewards")
      .select("id")
      .eq("telegram_id", telegram_id)
      .eq("date", today)
      .maybeSingle();

    if (rewardError) {
      console.error("⚠️ Supabase [powerbank_rewards] error:", rewardError.message);
    }

    const ep = activity?.ep || 0;
    const double_goal = activity?.double_goal || false;
    const ep_frozen = activity?.ep_frozen || false;
    const ep_reward_claimed = !!reward;

    return res.status(200).json({
      ep,
      double_goal,
      ep_frozen,
      ep_reward_claimed,
    });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
};