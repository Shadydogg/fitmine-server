// /api/powerbanks/stats.js — v1.0.0
const supabase = require("../../lib/supabase");
const verifyAccessToken = require("../../lib/verifyAccessToken");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const user = await verifyAccessToken(req);
    const telegram_id = user.telegram_id;

    const { data, error } = await supabase
      .from("user_powerbanks")
      .select("id, used, used_at")
      .eq("telegram_id", telegram_id)
      .order("used_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: "Ошибка Supabase", details: error.message });
    }

    const usedBanks = data.filter(pb => pb.used);
    const lastUsed = usedBanks[0]?.used_at || null;

    const usedToday = lastUsed && new Date(lastUsed).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);

    return res.status(200).json({
      ok: true,
      usedCount: usedBanks.length,
      lastUsedAt: lastUsed,
      usedToday
    });
  } catch (err) {
    console.error("❌ /powerbanks/stats ERROR:", err);
    return res.status(401).json({ error: err.message || "Unauthorized" });
  }
};
