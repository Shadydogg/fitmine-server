const express = require("express");
const router = express.Router();
const { supabase } = require("../../lib/supabase");
const { verifyToken } = require("../../lib/jwt");

router.post("/", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing authorization" });

  const token = authHeader.split(" ")[1];
  const user = verifyToken(token);
  if (!user || !user.telegram_id) return res.status(401).json({ error: "Invalid token" });

  const { landId, connectedMinerIds } = req.body;

  if (!landId || !Array.isArray(connectedMinerIds)) {
    return res.status(400).json({ error: "Missing landId or connectedMinerIds[]" });
  }

  const { data, error } = await supabase
    .from("land_nfts")
    .update({ connected_miner_ids: connectedMinerIds })
    .eq("id", landId)
    .eq("telegram_id", user.telegram_id)
    .select()
    .single();

  if (error) {
    console.error("[LAND UPDATE] Ошибка:", error);
    return res.status(500).json({ error: "Failed to update land" });
  }

  return res.json({ ok: true, land: data });
});

module.exports = router;
