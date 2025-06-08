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

    // 📥 Получаем user_activity на сегодня
    const { data: activity, error: fetchError } = await supabase
      .from("user_activity")
      .select("*")
      .eq("telegram_id", telegram_id)
      .eq("date", today)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ Ошибка получения активности:", fetchError);
      return res.status(500).json({ error: "Ошибка получения активности" });
    }

    if (!activity) {
      return res.status(404).json({ error: "Активность за сегодня не найдена" });
    }

    const goal = activity.double_goal ? 2000 : 1000;

    // ❌ Цель не достигнута
    if (activity.ep < goal) {
      return res.status(400).json({ error: `Цель не достигнута (${activity.ep}/${goal})` });
    }

    // ❌ Уже получен PowerBank
    if (activity.ep_reward_claimed) {
      return res.status(400).json({ error: "Сегодня уже получен PowerBank", alreadyClaimed: true });
    }

    // 🎁 Вставляем PowerBank
    const { data: inserted, error: insertError } = await supabase
      .from("user_powerbanks")
      .insert({
        telegram_id,
        ep_amount: activity.ep,
        source: "ep_daily_goal",
        powerbank_type: "basic",
        claimed_at: new Date().toISOString(),
        used: false
      })
      .select("id")
      .maybeSingle();

    if (insertError || !inserted?.id) {
      console.error("❌ Ошибка вставки PowerBank:", insertError);
      return res.status(500).json({ error: "Ошибка при создании PowerBank" });
    }

    // 🔁 Обновляем user_activity
    const { error: updateError } = await supabase
      .from("user_activity")
      .upsert({
        telegram_id,
        date: today,
        ep: 0,
        ep_reward_claimed: true,
        double_goal: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: ['telegram_id', 'date']
      });

    if (updateError) {
      console.error("❌ Ошибка обновления активности:", updateError);
      return res.status(500).json({ error: "Ошибка обновления активности" });
    }

    return res.status(200).json({
      ok: true,
      rewardId: inserted.id,
      rewardType: "powerbank_basic",
      message: "🎉 Цель достигнута. PowerBank выдан!",
    });

  } catch (err) {
    console.error("❌ /api/ep/claim ERROR:", err);
    return res.status(401).json({ error: err.message || "Unauthorized" });
  }
};
