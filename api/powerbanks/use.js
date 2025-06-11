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

    const { data: activity, error: activityFetchError } = await supabase
      .from("user_activity")
      .select("ep")
      .eq("telegram_id", telegram_id)
      .eq("date", today)
      .maybeSingle();

    if (activityFetchError) {
      console.error("❌ Ошибка получения активности:", activityFetchError);
      return res.status(500).json({ error: "Failed to fetch activity" });
    }

    const currentEP = activity?.ep || 0;
    const newEP = Math.max(currentEP, 1000);

    const { error: updateActivityError } = await supabase
      .from("user_activity")
      .upsert(
        {
          telegram_id,
          date: today,
          ep: newEP,
          ep_frozen: true, // ✅ КРИТИЧЕСКИ ВАЖНО
          updated_at: new Date().toISOString(),
        },
        { onConflict: ["telegram_id", "date"] }
      );

    if (updateActivityError) {
      console.error("❌ Ошибка обновления активности:", updateActivityError);
      return res.status(500).json({ error: "Failed to update EP" });
    }

    const { error: updatePBError } = await supabase
      .from("user_powerbanks")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", id);

    if (updatePBError) {
      return res.status(500).json({ error: "Failed to mark PowerBank as used" });
    }

    return res.status(200).json({
      ok: true,
      message: `✅ PowerBank использован. Выдано 1000 EP.`,
      ep: newEP,
      ep_frozen: true,
    });

  } catch (err) {
    console.error("❌ /api/powerbanks/use ERROR:", err);
    return res.status(401).json({ error: "Unauthorized", message: err.message });
  }
};