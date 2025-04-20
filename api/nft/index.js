// /api/nft/index.js — v2.0.0 (JWT + verifyAccessToken)
const express = require('express');
const router = express.Router();
const supabase = require('../../lib/supabase');
const verifyAccessToken = require('../../lib/verifyAccessToken');

router.get('/', async (req, res) => {
  try {
    const user = await verifyAccessToken(req);
    const telegram_id = user.telegram_id;

    const { data, error } = await supabase
      .from('nft_miners')
      .select('*')
      .eq('telegram_id', telegram_id);

    if (error) {
      console.error('[NFT API] Ошибка загрузки NFT:', error);
      return res.status(500).json({ error: 'Failed to load NFTs' });
    }

    return res.json(data);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
});

module.exports = router;