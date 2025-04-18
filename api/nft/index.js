// 📄 server/api/nft/index.js — v1.0.0

const express = require('express');
const router = express.Router();
const { supabase } = require('../../lib/supabase');
const { verifyToken } = require('../../lib/jwt');

router.get('/', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization' });

  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const { data, error } = await supabase
    .from('nft_miners')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error('[NFT API] Ошибка загрузки NFT:', error);
    return res.status(500).json({ error: 'Failed to load NFTs' });
  }

  return res.json(data);
});

module.exports = router;
