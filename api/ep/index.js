// /api/ep/index.js — v2.1.0
const supabase = require("../../lib/supabase");
const verifyAccessToken = require("../../lib/verifyAccessToken");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const user = await verifyAccessToken(req);
    const telegram_id = user.telegram_id;
    const today = new Date().toISOString().slice(0, 10);

    const { data: activity, error } = await supabase
      .from("user_activity")
      .select("ep, double_goal, ep_reward_claimed")
      .eq("telegram_id", telegram_id)
      .eq("date", today)
      .maybeSingle();

    if (error) {
      console.error("❌ Ошибка загрузки EP:", error);
      return res.status(500).json({ error: "Failed to load EP", details: error.message });
    }

    return res.status(200).json({
      ep: activity?.ep || 0,
      double_goal: !!activity?.double_goal,
      ep_reward_claimed: !!activity?.ep_reward_claimed
    });
  } catch (err) {
    console.error("❌ /api/ep/index ERROR:", err);
    return res.status(401).json({ error: err.message || "Unauthorized" });
  }
};
