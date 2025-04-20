// /api/nft/upgrade.js — v2.0.0 (JWT + verifyAccessToken)
const express = require('express');
const router = express.Router();
const supabase = require('../../lib/supabase');
const verifyAccessToken = require('../../lib/verifyAccessToken');

router.post('/', async (req, res) => {
  try {
    const user = await verifyAccessToken(req);
    const telegram_id = user.telegram_id;

    const { nftId } = req.body;
    if (!nftId) return res.status(400).json({ error: 'Missing NFT ID' });

    const { data: nft, error: nftError } = await supabase
      .from('nft_miners')
      .select('*')
      .eq('id', nftId)
      .eq('telegram_id', telegram_id)
      .single();

    if (nftError || !nft) {
      return res.status(404).json({ error: 'NFT not found' });
    }

    const upgradeCost = 100; // TODO: связать с FIT-балансом
    const newLevel = nft.level + 1;

    const { error: updateError } = await supabase
      .from('nft_miners')
      .update({ level: newLevel })
      .eq('id', nft.id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to upgrade NFT' });
    }

    return res.json({ ok: true, message: 'NFT upgraded successfully', newLevel });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
});

module.exports = router;
