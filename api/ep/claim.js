// /api/ep/claim.js — v2.5.0
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

    // 1. Получаем активность за сегодня
    const { data: activity, error: fetchError } = await supabase
      .from("user_activity")
      .select("*")
      .eq("telegram_id", telegram_id)
      .eq("date", today)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ Ошибка получения активности:", fetchError);
      return res.status(500).json({ error: "Failed to fetch activity" });
    }

    if (!activity || activity.ep < 1000) {
      return res.status(400).json({ error: "EP goal not reached yet" });
    }

    if (activity.ep_reward_claimed) {
      return res.status(400).json({ error: "Reward already claimed", alreadyClaimed: true });
    }

    const epToSave = activity.ep;

    // 2. Вставляем PowerBank
    const { data: inserted, error: insertError } = await supabase
      .from("user_powerbanks")
      .insert({
        telegram_id,
        ep_amount: epToSave,
        source: "ep_daily_goal",
        powerbank_type: "basic"
      })
      .select("id")
      .maybeSingle();

    if (insertError || !inserted?.id) {
      console.error("❌ Ошибка вставки PowerBank:", insertError);
      return res.status(500).json({ error: "Failed to create PowerBank" });
    }

    // 3. Обновляем user_activity: сбрасываем EP, отмечаем награду, включаем double_goal
    const { error: updateError } = await supabase
      .from("user_activity")
      .update({
        ep: 0,
        ep_reward_claimed: true,
        double_goal: true,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_id", telegram_id)
      .eq("date", today);

    if (updateError) {
      console.error("❌ Ошибка обновления активности:", updateError);
      return res.status(500).json({ error: "Failed to update activity" });
    }

    // 4. Успех
    return res.status(200).json({
      ok: true,
      rewardId: inserted.id,
      rewardType: "powerbank_basic"
    });

  } catch (err) {
    console.error("❌ Ошибка в /api/ep/claim:", err);
    return res.status(401).json({ error: err.message || "Unauthorized" });
  }
};
