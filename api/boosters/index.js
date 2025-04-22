const express = require("express");
const router = express.Router();
const supabase = require("../../lib/supabase");
const verifyAccessToken = require("../../lib/verifyAccessToken");
const { v4: uuidv4 } = require("uuid");

// 🎯 Конфигурация бустеров
const BOOSTER_TYPES = {
  hashrate: { duration: 60, boost: 1.5 },
  ep_boost: { duration: 45, boost: 1.2 },
  xp_boost: { duration: 90, boost: 2.0 },
  pvp_shield: { duration: 120, boost: 1.0 },
};

// ✅ GET /api/boosters — получить активные бустеры
router.get("/", async (req, res) => {
  try {
    const user = await verifyAccessToken(req);
    const telegram_id = user.telegram_id;

    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("boosters")
      .select("*")
      .eq("telegram_id", telegram_id)
      .lte("active_at", nowIso)
      .gte("expires_at", nowIso)
      .order("active_at", { ascending: false });

    if (error) {
      console.error("[Boosters API] Ошибка при получении бустеров:", error.message);
      return res.status(500).json({ error: "Failed to fetch boosters" });
    }

    return res.status(200).json({ boosters: data || [] });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
});

// ✅ POST /api/boosters — активировать бустер
router.post("/", async (req, res) => {
  try {
    const user = await verifyAccessToken(req);
    const telegram_id = user.telegram_id;

    const { type } = req.body;
    if (!BOOSTER_TYPES[type]) {
      return res.status(400).json({ error: "Invalid booster type" });
    }

    const now = new Date();
    const { duration, boost } = BOOSTER_TYPES[type];
    const expiresAt = new Date(now.getTime() + duration * 60000);

    // ⛔ Проверка на уже активный бустер того же типа
    const { data: existing, error: existingError } = await supabase
      .from("boosters")
      .select("id, expires_at")
      .eq("telegram_id", telegram_id)
      .eq("type", type)
      .gte("expires_at", now.toISOString())
      .maybeSingle();

    if (existing) {
      return res.status(400).json({
        error: "Этот бустер уже активен. Подождите окончания его действия.",
      });
    }

    // ✅ Создание нового бустера
    const booster = {
      id: uuidv4(),
      telegram_id,
      type,
      ep_cost: 0,
      duration,
      boost,
      active_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const { error } = await supabase.from("boosters").insert(booster);
    if (error) {
      console.error("[Boosters API] Ошибка при активации бустера:", error.message);
      return res.status(500).json({ error: "Failed to activate booster" });
    }

    return res.status(200).json({ ok: true, booster });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
});

module.exports = router;
