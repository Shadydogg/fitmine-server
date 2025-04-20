// /api/land/update.js — v2.0.0 (JWT + verifyAccessToken)
const express = require("express");
const router = express.Router();
const supabase = require("../../lib/supabase");
const verifyAccessToken = require("../../lib/verifyAccessToken");

router.post("/", async (req, res) => {
  try {
    const user = await verifyAccessToken(req);
    const telegram_id = user.telegram_id;
    const { landId, connectedMinerIds } = req.body;

    if (!landId || !Array.isArray(connectedMinerIds)) {
      return res.status(400).json({ error: "Missing landId or connectedMinerIds[]" });
    }

    const { data, error } = await supabase
      .from("land_nfts")
      .update({ connected_miner_ids: connectedMinerIds })
      .eq("id", landId)
      .eq("telegram_id", telegram_id)
      .select()
      .single();

    if (error) {
      console.error("[LAND UPDATE] Ошибка:", error);
      return res.status(500).json({ error: "Failed to update land" });
    }

    return res.json({ ok: true, land: data });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
});

module.exports = router;
