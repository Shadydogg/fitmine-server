// /api/ep/claim.js — v2.0.0 (JWT + jti проверка)
const verifyAccessToken = require("../../lib/verifyAccessToken");
const supabase = require("../../lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const user = await verifyAccessToken(req); // { telegram_id, jti, ... }
    const telegram_id = user.telegram_id;
    const today = new Date().toISOString().slice(0, 10);

    const { data, error: fetchError } = await supabase
      .from("user_activity")
      .select("ep, ep_reward_claimed")
      .eq("telegram_id", telegram_id)
      .eq("date", today)
      .single();

    if (fetchError) {
      return res.status(500).json({ error: "Failed to fetch user_activity", details: fetchError.message });
    }

    if (!data || data.ep < 1000) {
      return res.status(400).json({ error: "EP goal not reached yet" });
    }

    if (data.ep_reward_claimed) {
      return res.status(200).json({ ok: true, alreadyClaimed: true });
    }

    const { error: updateError } = await supabase
      .from("user_activity")
      .update({ ep_reward_claimed: true })
      .eq("telegram_id", telegram_id)
      .eq("date", today);

    if (updateError) {
      return res.status(500).json({ error: "Failed to update reward status", details: updateError.message });
    }

    return res.status(200).json({ ok: true, reward: "xp_box_1" });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
};
