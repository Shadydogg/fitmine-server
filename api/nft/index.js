const express = require('express');
const router = express.Router();
const supabase = require('../../lib/supabase');
const verifyAccessToken = require('../../lib/verifyAccessToken');

router.get('/', async (req, res) => {
  try {
    const user = await verifyAccessToken(req);
    const telegram_id = user.telegram_id;
    const today = new Date().toISOString().slice(0, 10);

    // Получаем EP пользователя
    const { data: epData, error: epError } = await supabase
      .from("user_activity")
      .select("ep")
      .eq("telegram_id", telegram_id)
      .eq("date", today)
      .single();

    const ep = epData?.ep || 0;
    if (epError && epError.code !== "PGRST116") {
      console.warn("[NFT API] Ошибка загрузки EP:", epError.message);
    }

    // Получаем список NFT
    const { data: nfts, error } = await supabase
      .from('nft_miners')
      .select('*')
      .eq('telegram_id', telegram_id);

    if (error) {
      console.error('[NFT API] Ошибка загрузки NFT:', error);
      return res.status(500).json({ error: 'Failed to load NFTs' });
    }

    // Добавляем поле boostPower
    const updated = nfts.map((nft) => {
      const basePower = nft.power || 0;
      const boostMultiplier = 1 + ep / 1000;
      return {
        ...nft,
        boostPower: Math.round(basePower * boostMultiplier),
        boostMultiplier: parseFloat(boostMultiplier.toFixed(3)), // дополнительная инфа
        userEP: ep,
      };
    });

    return res.json(updated);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
});

module.exports = router;
