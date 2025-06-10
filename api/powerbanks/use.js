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

    // Получаем PowerBank
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

    const today = new Date().toISOString().slice(0, 10);

    // Проверяем текущую активность
    const { data: activity, error: activityFetchError } = await supabase
      .from("user_activity")
      .select("ep, double_goal")
      .eq("telegram_id", telegram_id)
      .eq("date", today)
      .maybeSingle();

    if (activityFetchError) {
      console.error("❌ Ошибка при получении активности:", activityFetchError);
      return res.status(500).json({ error: "Failed to fetch activity" });
    }

    if (activity?.double_goal) {
      return res.status(400).json({ error: "PowerBank уже активен сегодня (double_goal = true)" });
    }

    const currentEP = activity?.ep || 0;

    // 🧠 Обновляем user_activity (double_goal = true), EP не трогаем
    const { error: updateActivityError } = await supabase
      .from("user_activity")
      .upsert(
        {
          telegram_id,
          date: today,
          double_goal: true,
          ep: currentEP,
          updated_at: new Date().toISOString(),
        },
        { onConflict: ["telegram_id", "date"] }
      );

    if (updateActivityError) {
      console.error("❌ Ошибка при обновлении активности:", updateActivityError);
      return res.status(500).json({ error: "Failed to update activity" });
    }

    // ✅ Помечаем PowerBank как использованный
    const { error: updatePBError } = await supabase
      .from("user_powerbanks")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", id);

    if (updatePBError) {
      return res.status(500).json({ error: "Failed to mark PowerBank as used" });
    }

    return res.status(200).json({
      ok: true,
      message: `✅ PowerBank активирован. Цели удвоены.`,
      ep: currentEP,
      double_goal: true,
    });

  } catch (err) {
    console.error("❌ /api/powerbanks/use ERROR:", err);
    return res.status(401).json({ error: "Unauthorized", message: err.message });
  }
};