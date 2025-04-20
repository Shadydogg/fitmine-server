// api/ep.js — v1.0.0 (Получение EP за сегодня)
const validateInitData = require("../lib/validateInitData");
const { supabase } = require("../lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { initData } = req.body;

  if (!initData) {
    return res.status(400).json({ error: "Missing initData" });
  }

  let user;
  try {
    user = validateInitData(initData);
  } catch (err) {
    return res.status(401).json({ error: "Invalid Telegram initData", details: err.message });
  }

  const telegram_id = user.id;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

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
};
