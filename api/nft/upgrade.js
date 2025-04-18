// 📄 server/api/nft/upgrade.js — v1.0.1

const express = require('express');
const router = express.Router();
const supabase = require('../../lib/supabase');
const { verifyToken } = require('../../lib/jwt');

router.post('/', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization' });

  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const { nftId } = req.body;
  if (!nftId) return res.status(400).json({ error: 'Missing NFT ID' });

  const { data: nft, error: nftError } = await supabase
    .from('nft_miners')
    .select('*')
    .eq('id', nftId)
    .eq('user_id', user.id)
    .single();

  if (nftError || !nft) {
    return res.status(404).json({ error: 'NFT not found' });
  }

  const upgradeCost = 100; // фиксированная стоимость за апгрейд уровня

  // 💰 TODO: проверить баланс FIT токенов после интеграции

  const newLevel = nft.level + 1;

  const { error: updateError } = await supabase
    .from('nft_miners')
    .update({ level: newLevel })
    .eq('id', nft.id);

  if (updateError) {
    return res.status(500).json({ error: 'Failed to upgrade NFT' });
  }

  return res.json({ ok: true, message: 'NFT upgraded successfully', newLevel });
});

module.exports = router;
