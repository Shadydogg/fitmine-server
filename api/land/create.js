// /api/land/create.js — v2.0.0 (JWT + verifyAccessToken)
const express = require("express");
const router = express.Router();
const supabase = require("../../lib/supabase");
const verifyAccessToken = require("../../lib/verifyAccessToken");

const rarityChances = [
  { rarity: "common", weight: 40 },
  { rarity: "rare", weight: 30 },
  { rarity: "epic", weight: 20 },
  { rarity: "legendary", weight: 8 },
  { rarity: "mythical", weight: 2 },
];

const rarityAttributes = {
  common: { slots: 2, bonus: [1.01, 1.05] },
  rare: { slots: 3, bonus: [1.06, 1.1] },
  epic: { slots: 4, bonus: [1.15, 1.25] },
  legendary: { slots: 5, bonus: [1.3, 1.5] },
  mythical: { slots: 6, bonus: [1.6, 2.0] },
};

function generateName() {
  const prefixes = ["Genesis", "Crystal", "Shadow", "Iron", "Nova", "Ember"];
  const suffixes = ["Valley", "Crater", "Ridge", "Citadel", "Fields", "Zone"];
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${
    suffixes[Math.floor(Math.random() * suffixes.length)]
  }`;
}

function getRandomRarity() {
  const totalWeight = rarityChances.reduce((acc, r) => acc + r.weight, 0);
  const roll = Math.random() * totalWeight;
  let sum = 0;
  for (const r of rarityChances) {
    sum += r.weight;
    if (roll <= sum) return r.rarity;
  }
  return "common";
}

router.post("/", async (req, res) => {
  try {
    const user = await verifyAccessToken(req);
    const telegram_id = user.telegram_id;

    const rarity = getRandomRarity();
    const attributes = rarityAttributes[rarity];
    const bonus = parseFloat((Math.random() * (attributes.bonus[1] - attributes.bonus[0]) + attributes.bonus[0]).toFixed(3));
    const name = req.body.name || generateName();
    const image = `/land/${name.toLowerCase().replace(/\s+/g, "-")}.png`;
    const description = "Новая земля, готовая к добыче энергии.";

    const { data, error } = await supabase
      .from("land_nfts")
      .insert([
        {
          telegram_id,
          name,
          rarity,
          bonus_multiplier: bonus,
          slots: attributes.slots,
          connected_miner_ids: [],
          image,
          description,
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
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
});

module.exports = router;