// /api/powerbanks/index.js — v1.0.0
const supabase = require('../../lib/supabase');
const verifyAccessToken = require('../../lib/verifyAccessToken');

module.exports = async function handler(req, res) {
  try {
    const user = await verifyAccessToken(req);
    const telegram_id = user.telegram_id;

    const { data, error } = await supabase
      .from('user_powerbanks')
      .select('*')
      .eq('telegram_id', telegram_id)
      .order('claimed_at', { ascending: false });

    if (error) {
      console.error("❌ Ошибка получения PowerBank:", error);
      return res.status(500).json({ error: "Failed to fetch powerbanks" });
    }

    return res.status(200).json({ ok: true, powerbanks: data || [] });
  } catch (err) {
    console.error("❌ Ошибка /api/powerbanks:", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
