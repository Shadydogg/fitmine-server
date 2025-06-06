// /api/powerbanks.js — v1.2.0
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
      .select("id, used, used_at, claimed_at, powerbank_type, source, ep_amount")
      .eq("telegram_id", telegram_id)
      .order("claimed_at", { ascending: false }) // ✅ основная сортировка
      .order("created_at", { ascending: false }); // ✅ fallback

    if (error) {
      return res.status(500).json({ error: "Failed to fetch powerbanks", details: error.message });
    }

    // 🛠️ Явно приводим used к булевому типу, на всякий случай
    const formatted = (data || []).map((pb) => ({
      ...pb,
      used: pb.used === true, // защищаемся от null/undefined
    }));

    return res.status(200).json({ ok: true, powerbanks: formatted });
  } catch (err) {
    console.error("❌ /api/powerbanks ERROR:", err);
    return res.status(401).json({ error: "Unauthorized", message: err.message });
  }
};
