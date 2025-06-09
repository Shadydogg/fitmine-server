// /api/ep/claim.js — v3.0.0
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

    // 1. Получаем сегодняшнюю активность
    const { data: activity, error: fetchError } = await supabase
      .from("user_activity")
      .select("*")
      .eq("telegram_id", telegram_id)
      .eq("date", today)
      .maybeSingle();

    if (fetchError || !activity) {
      return res.status(500).json({ error: "Ошибка получения активности" });
    }

    // 2. Проверка: PowerBank уже получен
    if (activity.ep_reward_claimed) {
      return res.status(200).json({
        ok: false,
        alreadyClaimed: true,
        message: "⚡ PowerBank уже получен сегодня",
      });
    }

    // 3. Проверка: цели уже удвоены — нельзя получить PowerBank
    if (activity.double_goal) {
      return res.status(200).json({
        ok: false,
        doubleGoalActive: true,
        message: "⚠️ Нельзя получить PowerBank после активации double goal",
      });
    }

    // 4. Проверка: не достигнута цель (1000 EP)
    if (activity.ep < 1000) {
      return res.status(200).json({
        ok: false,
        goalNotReached: true,
        currentEP: activity.ep,
        message: `🎯 Недостаточно EP (${activity.ep}/1000) для PowerBank`,
      });
    }

    // 5. Вставляем PowerBank
    const { data: inserted, error: insertError } = await supabase
      .from("user_powerbanks")
      .insert({
        telegram_id,
        ep_amount: activity.ep,
        source: "ep_daily_goal",
        powerbank_type: "basic",
        claimed_at: new Date().toISOString(),
        used: false,
      })
      .select("id")
      .maybeSingle();

    if (insertError || !inserted?.id) {
      console.error("❌ Ошибка вставки PowerBank:", insertError);
      return res.status(500).json({ error: "Ошибка при создании PowerBank" });
    }

    // 6. Обновляем user_activity: сбрасываем EP, ставим double_goal
    const { error: updateError } = await supabase
      .from("user_activity")
      .upsert({
        telegram_id,
        date: today,
        ep: 0,
        ep_reward_claimed: true,
        double_goal: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: ['telegram_id', 'date']
      });

    if (updateError) {
      return res.status(500).json({ error: "Ошибка обновления активности" });
    }

    // 7. Ответ
    return res.status(200).json({
      ok: true,
      powerbankCreated: true,
      rewardId: inserted.id,
      rewardType: "powerbank_basic",
      message: "🎉 PowerBank успешно получен!",
    });

  } catch (err) {
    console.error("❌ /api/ep/claim ERROR:", err);
    return res.status(401).json({ error: "Unauthorized", message: err.message });
  }
};
