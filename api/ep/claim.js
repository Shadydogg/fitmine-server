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

    if (ep_reward_claimed) {
      return res.status(200).json({
        ok: false,
        alreadyClaimed: true,
        message: "⚡ PowerBank уже получен сегодня",
      });
    }

    if (double_goal) {
      return res.status(200).json({
        ok: false,
        doubleGoalActive: true,
        message: "⚠️ Цели уже удвоены, PowerBank недоступен",
      });
    }

    if (ep < 1000) {
      return res.status(200).json({
        ok: false,
        goalNotReached: true,
        currentEP: ep,
        message: `🎯 Недостаточно EP (${ep}/1000) для PowerBank`,
      });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("user_powerbanks")
      .insert({
        telegram_id,
        ep_amount: ep,
        source: "ep_daily_goal",
        powerbank_type: "basic",
        claimed_at: new Date().toISOString(),
        used: false,
      })
      .select("id")
      .maybeSingle();

    if (insertError || !inserted?.id) {
      console.error("❌ Ошибка вставки PowerBank:", insertError);
      return res.status(500).json({ error: "Ошибка создания PowerBank" });
    }

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
      console.error("❌ Ошибка обновления user_activity:", updateError);
      return res.status(500).json({ error: "Ошибка обновления активности" });
    }

    console.log(`✅ PowerBank выдан: ${inserted.id} | EP = ${ep} | double_goal = true`);

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