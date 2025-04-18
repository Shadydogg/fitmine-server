const express = require("express");
const router = express.Router();
const supabase = require("../../lib/supabase");
const { verifyToken } = require("../../lib/jwt");

// 🎯 Редкость и веса выпадения
const rarityChances = [
  { rarity: "common", weight: 40 },
  { rarity: "rare", weight: 30 },
  { rarity: "epic", weight: 20 },
  { rarity: "legendary", weight: 8 },
  { rarity: "mythical", weight: 2 },
];

// 🎯 Слоты и множители по редкости
const rarityAttributes = {
  common: { slots: 2, bonus: [1.01, 1.05] },
  rare: { slots: 3, bonus: [1.06, 1.10] },
  epic: { slots: 4, bonus: [1.15, 1.25] },
  legendary: { slots: 5, bonus: [1.30, 1.50] },
  mythical: { slots: 6, bonus: [1.80, 2.00] },
};

// 📛 Генерация названия земли
function generateName() {
  const prefixes = ["Crystal", "Genesis", "Iron", "Ember", "Shadow", "Nebula"];
  const suffixes = ["Valley", "Crater", "Ridge", "Fields", "Wastes", "Citadel"];
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
}

// 🎲 Определение редкости
function getRandomRarity() {
  const totalWeight = rarityChances.reduce((acc, r) => acc + r.weight, 0);
  const rand = Math.random() * totalWeight;
  let sum = 0;
  for (const r of rarityChances) {
    sum += r.weight;
    if (rand <= sum) return r.rarity;
  }
  return "common";
}

// 🚀 POST /api/land/create
router.post("/", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing authorization" });

  const token = authHeader.split(" ")[1];
  const user = verifyToken(token);
  if (!user?.id) return res.status(401).json({ error: "Invalid token" });

  const rarity = getRandomRarity();
  const attributes = rarityAttributes[rarity];
  const bonus = parseFloat((Math.random() * (attributes.bonus[1] - attributes.bonus[0]) + attributes.bonus[0]).toFixed(3));
  const name = req.body.name || generateName();

  const { data, error } = await supabase
    .from("land_nfts")
    .insert([
      {
        user_id: user.id, // Telegram ID напрямую
        name,
        rarity,
        bonusMultiplier: bonus,
        slots: attributes.slots,
        connectedMinerIds: [],
        created_at: new Date().toISOString(),
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("❌ Ошибка при создании земли:", error);
    return res.status(500).json({ error: "Failed to mint land" });
  }

  return res.status(200).json({ ok: true, land: data });
});

module.exports = router;
