const supabase = require("../../lib/supabase");
const verifyAccessToken = require("../../lib/verifyAccessToken");
const bot = require("../../bot/bot"); // 🆕 Telegram бот

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const user = await verifyAccessToken(req);
    const telegram_id = user.telegram_id;
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Missing PowerBank ID" });
    }

    const { data: powerbank, error: fetchError } = await supabase
      .from("user_powerbanks")
      .select("*")
      .eq("id", id)
      .eq("telegram_id", telegram_id)
      .maybeSingle();

    if (fetchError) {
      return res.status(500).json({ error: "Failed to fetch PowerBank", details: fetchError.message });
    }

    if (!powerbank) {
      return res.status(404).json({ error: "PowerBank not found" });
    }

    if (powerbank.used) {
      return res.status(400).json({ error: "PowerBank already used" });
    }

    const today = new Date().toISOString().slice(0, 10);

    const { data: activity, error: activityError } = await supabase
      .from("user_activity")
      .select("ep, double_goal")
      .eq("telegram_id", telegram_id)
      .eq("date", today)
      .maybeSingle();

    if (activityError) {
      return res.status(500).json({ error: "Failed to fetch activity", details: activityError.message });
    }

    const currentEP = activity?.ep || 0;
    const doubleGoal = activity?.double_goal || false;

    if (currentEP >= 1000) {
      return res.status(400).json({ error: "Нельзя использовать PowerBank при полной энергии (EP ≥ 1000)" });
    }

    if (doubleGoal) {
      return res.status(400).json({ error: "Нельзя использовать PowerBank после удвоенной цели EP" });
    }

    const { error: updateError } = await supabase
      .from("user_powerbanks")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      return res.status(500).json({ error: "Failed to update PowerBank", details: updateError.message });
    }

    const { error: epUpdateError } = await supabase
      .from("user_activity")
      .upsert({
        telegram_id,
        date: today,
        ep: 1000,
        ep_reward_claimed: true
      }, { onConflict: ['telegram_id', 'date'] });

    if (epUpdateError) {
      return res.status(500).json({ error: "Failed to apply PowerBank effect", details: epUpdateError.message });
    }

    // 📬 Telegram-уведомление
    await bot.telegram.sendMessage(
      telegram_id,
      `⚡ Вы активировали PowerBank!\n\n🧠 Энергия восстановлена до 1000 EP и теперь можно продолжить майнинг NFT.`
    );

    return res.status(200).json({
      ok: true,
      message: "⚡ PowerBank активирован — EP восстановлено до 1000!",
      powerbank_id: id
    });
  } catch (err) {
    console.error("❌ /api/powerbanks/use ERROR:", err);
    return res.status(401).json({ error: err.message || "Unauthorized" });
  }
};
