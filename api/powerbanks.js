// /api/powerbanks.js — v1.1.0
const supabase = require("../lib/supabase");
const verifyAccessToken = require("../lib/verifyAccessToken");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const user = await verifyAccessToken(req);
    const telegram_id = user.telegram_id;

    const { data, error } = await supabase
      .from("user_powerbanks")
      .select("*")
      .eq("telegram_id", telegram_id)
      .order("created_at", { ascending: false }); // ✅ fallback, безопасный порядок

    if (error) {
      return res.status(500).json({ error: "Failed to fetch powerbanks", details: error.message });
    }

    return res.status(200).json({ ok: true, powerbanks: data });
  } catch (err) {
    console.error("❌ /api/powerbanks ERROR:", err);
    return res.status(401).json({ error: "Unauthorized", message: err.message });
  }
};
