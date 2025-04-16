// v2.0.0 - JWT авторизация
const express = require('express');
const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fitmine_super_secret';

router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [authType, token] = authHeader.split(' ');

    if (authType !== 'Bearer' || !token) {
      return res.status(401).json({ ok: false, error: 'Missing or invalid Authorization header' });
    }

    let telegram_id;
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      telegram_id = payload.telegram_id;
    } catch (err) {
      return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single();

    if (error) {
      console.error('❌ Supabase error:', error.message);
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    return res.status(200).json({ ok: true, user });

  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

module.exports = router;
