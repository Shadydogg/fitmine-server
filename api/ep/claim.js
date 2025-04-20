// /api/ep/claim.js — v1.0.1 (EP награда за 100% дневной цели)
const validateInitData = require("../../lib/validateInitData");
const supabase = require("../../lib/supabase"); // 🔁 исправленный импорт

/**
 * POST /api/ep/claim
 * @desc Проверяет и активирует награду за 100% дневной цели EP
 * @body { initData: string }
 * @returns { ok: true, alreadyClaimed?: true, reward?: string } | { error }
 */
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { initData } = req.body;
  if (!initData) {
    return res.status(400).json({ error: "Missing initData" });
  }

  // ✅ Валидация Telegram initData
  let user;
  try {
    user = validateInitData(initData);
  } catch (err) {
    return res.status(401).json({ error: "Invalid initData", details: err.message });
  }

  const telegram_id = user.id;
  const today = new Date().toISOString().slice(0, 10);

  // 📥 Получаем активность за сегодня
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

  // 📝 Обновляем статус награды
  const { error: updateError } = await supabase
    .from("user_activity")
    .update({ ep_reward_claimed: true })
    .eq("telegram_id", telegram_id)
    .eq("date", today);

  if (updateError) {
    return res.status(500).json({ error: "Failed to update reward status", details: updateError.message });
  }

  // 🎁 Вернуть тип награды
  return res.status(200).json({
    ok: true,
    reward: "xp_box_1",
  });
};
