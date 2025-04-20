// /api/ep.js — v2.0.0 (JWT + jti проверка)
const verifyAccessToken = require("../lib/verifyAccessToken");
const supabase = require("../lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const user = await verifyAccessToken(req); // { telegram_id, jti, ... }
    const telegram_id = user.telegram_id;
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("user_activity")
      .select("ep")
      .eq("telegram_id", telegram_id)
      .eq("date", today)
      .single();

    if (error && error.code !== "PGRST116") {
      return res.status(500).json({ error: "Supabase error", details: error.message });
    }

    return res.status(200).json({ ep: data?.ep || 0 });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
};