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

    // 1. Получаем активность за сегодня
    const { data: activity, error: fetchError } = await supabase
      .from("user_activity")
      .select("ep, ep_reward_claimed, double_goal")
      .eq("telegram_id", telegram_id)
      .eq("date", today)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ Ошибка загрузки user_activity:", fetchError);
      return res.status(500).json({ error: "Ошибка получения активности" });
    }

    if (!activity) {
      return res.status(404).json({ error: "Активность за сегодня не найдена" });
    }

    const { ep, ep_reward_claimed, double_goal } = activity;

    // 2. Проверка: PowerBank уже использован сегодня
    const { data: usedTodayPBs, error: pbError } = await supabase
      .from("user_powerbanks")
      .select("used, used_at")
      .eq("telegram_id", telegram_id)
      .eq("used", true);

    if (pbError) {
      console.error("❌ Ошибка проверки PowerBank:", pbError);
      return res.status(500).json({ error: "Ошибка проверки PowerBank" });
    }

    const usedToday = (usedTodayPBs || []).some(pb => {
      const usedAt = pb.used_at ? new Date(pb.used_at).toISOString().slice(0, 10) : null;
      return usedAt === today;
    });

    if (usedToday) {
      return res.status(200).json({
        ok: false,
        powerbankUsedToday: true,
        message: "⚠️ Сегодня уже был использован PowerBank, получение невозможно",
      });
    }

    // 3. Уже получен PowerBank
    if (ep_reward_claimed) {
      return res.status(200).json({
        ok: false,
        alreadyClaimed: true,
        message: "⚡ PowerBank уже получен сегодня",
      });
    }

    // 4. Цели уже удвоены
    if (double_goal) {
      return res.status(200).json({
        ok: false,
        doubleGoalActive: true,
        message: "⚠️ Цели уже удвоены, PowerBank недоступен",
      });
    }

    // 5. Недостаточно EP
    if (ep < 1000) {
      return res.status(200).json({
        ok: false,
        goalNotReached: true,
        currentEP: ep,
        message: `🎯 Недостаточно EP (${ep}/1000) для PowerBank`,
      });
    }

    // 6. Создание записи в powerbank_rewards
    const { data: rewardRow, error: rewardInsertError } = await supabase
      .from("powerbank_rewards")
      .insert({
        telegram_id,
        type: "ep_daily_goal",
        source: "claim_api",
        context: `daily_claim_${today}`,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (rewardInsertError || !rewardRow?.id) {
      console.error("❌ Ошибка создания записи в powerbank_rewards:", rewardInsertError);
      return res.status(500).json({ error: "Ошибка создания награды" });
    }

    const reward_id = rewardRow.id;

    // 7. Вставка PowerBank
    const { data: inserted, error: insertError } = await supabase
      .from("user_powerbanks")
      .insert({
        telegram_id,
        ep_amount: ep,
        source: "ep_daily_goal",
        powerbank_type: "basic",
        claimed_at: new Date().toISOString(),
        used: false,
        reward_id,
      })
      .select("id")
      .maybeSingle();

    if (insertError || !inserted?.id) {
      console.error("❌ Ошибка вставки PowerBank:", insertError);
      return res.status(500).json({ error: "Ошибка создания PowerBank" });
    }

    // 8. Обновление user_activity: обнуляем EP, отмечаем награду, НЕ замораживаем
    const { error: updateError } = await supabase
      .from("user_activity")
      .upsert({
        telegram_id,
        date: today,
        ep: 0,
        ep_reward_claimed: true,
        double_goal: true,
        ep_frozen: false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: ['telegram_id', 'date'],
      });

    if (updateError) {
      console.error("❌ Ошибка обновления user_activity:", updateError);
      return res.status(500).json({ error: "Ошибка обновления активности" });
    }

    console.log(`✅ PowerBank выдан: ${inserted.id} | double_goal=true | reward_id=${reward_id}`);

    return res.status(200).json({
      ok: true,
      rewardId: inserted.id,
      rewardType: "powerbank_basic",
      powerbankCreated: true,
      doubleGoal: true,
      message: "🎉 Цель достигнута. PowerBank выдан и цели удвоены!",
    });

  } catch (err) {
    console.error("❌ /api/ep/claim ERROR:", err);
    return res.status(401).json({ error: "Unauthorized", message: err.message });
  }
};