const express = require("express");
const router = express.Router();
const supabase = require("../../lib/supabase"); // ✅ исправленный импорт
const { verifyToken } = require("../../lib/jwt");

router.get("/", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing authorization" });

  const token = authHeader.split(" ")[1];
  const user = verifyToken(token);
  if (!user || !user.telegram_id) return res.status(401).json({ error: "Invalid token" });

  const { data, error } = await supabase
    .from("land_nfts")
    .select("*")
    .eq("telegram_id", user.telegram_id); // ✅ используем telegram_id

  if (error) {
    console.error("[LAND API] Ошибка загрузки земель:", error);
    return res.status(500).json({ error: "Failed to load lands" });
  }

  return res.json(data);
});

module.exports = router;
