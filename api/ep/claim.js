// /api/ep/claim.js — v2.4.0
const supabase = require("../../lib/supabase");
const verifyAccessToken = require("../../lib/verifyAccessToken");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const user = await verifyAccessToken(req);
    const telegram_id = user.telegram_id;
    const today = new Date().toISOString().slice(0, 10);

    const { data: activity, error: fetchError } = await supabase
      .from("user_activity")
      .select("*")
      .eq("telegram_id", telegram_id)
      .eq("date", today)
      .maybeSingle();

    if (fetchError) {
      return res.status(500).json({ error: "Failed to fetch activity", details: fetchError.message });
    }

    if (!activity || activity.ep < 1000) {
      return res.status(400).json({ error: "EP goal not reached yet" });
    }

    if (activity.ep_reward_claimed) {
      return res.status(400).json({ error: "Reward already claimed", alreadyClaimed: true });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("user_powerbanks")
      .insert({
        telegram_id,
        ep_amount: activity.ep,
        source: "ep_daily_goal",
        powerbank_type: "basic"
      })
      .select("id")
      .single();

    if (insertError) {
      return res.status(500).json({ error: "Failed to create PowerBank", details: insertError.message });
    }

    const { error: updateError } = await supabase
      .from("user_activity")
      .update({
        ep_reward_claimed: true,
        ep: 0,
        double_goal: true // ✅ Активируем двойную цель
      })
      .eq("telegram_id", telegram_id)
      .eq("date", today);

    if (updateError) {
      return res.status(500).json({ error: "Failed to update reward status", details: updateError.message });
    }

    return res.status(200).json({
      ok: true,
      rewardId: inserted.id,
      rewardType: "powerbank_basic"
    });
  } catch (err) {
    console.error("❌ /api/ep/claim ERROR:", err);
    return res.status(401).json({ error: err.message || "Unauthorized" });
  }
};
