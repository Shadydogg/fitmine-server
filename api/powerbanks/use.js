// /api/powerbanks/use.js — v1.2.0
const supabase = require("../../lib/supabase");
const verifyAccessToken = require("../../lib/verifyAccessToken");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const user = await verifyAccessToken(req);
    const telegram_id = user.telegram_id;
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Missing powerbank id" });
    }

    // Проверка наличия PowerBank
    const { data: powerbank, error: fetchError } = await supabase
      .from("user_powerbanks")
      .select("*")
      .eq("id", id)
      .eq("telegram_id", telegram_id)
      .maybeSingle();

    if (fetchError || !powerbank) {
      return res.status(404).json({ error: "PowerBank not found" });
    }

    if (powerbank.used) {
      return res.status(400).json({ error: "PowerBank already used" });
    }

    // Обновляем PowerBank как использованный
    const { error: updateError } = await supabase
      .from("user_powerbanks")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      return res.status(500).json({ error: "Failed to mark PowerBank as used" });
    }

    // 🧠 Устанавливаем double_goal = true на сегодня
    const today = new Date().toISOString().slice(0, 10);

    const { error: goalError } = await supabase
      .from("user_activity")
      .upsert(
        {
          telegram_id,
          date: today,
          double_goal: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: ["telegram_id", "date"] }
      );

    if (goalError) {
      console.error("❌ Ошибка при установке double_goal:", goalError);
      return res.status(500).json({ error: "Failed to update activity goals" });
    }

    return res.status(200).json({
      ok: true,
      message: "✅ PowerBank применён. Цели удвоены на сегодня!",
    });
  } catch (err) {
    console.error("❌ /api/powerbanks/use ERROR:", err);
    return res.status(401).json({ error: "Unauthorized", message: err.message });
  }
};
