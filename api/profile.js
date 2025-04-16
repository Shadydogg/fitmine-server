// v2.1.0 - JWT авторизация + google_connected
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
      console.warn('❌ JWT валидация не пройдена:', err.message);
      return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
    }

    // 🧩 Получаем пользователя из таблицы users
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single();

    if (userError || !user) {
      console.error('❌ Supabase [users] error:', userError?.message || 'Not found');
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // 🔍 Проверяем наличие токена Google Fit
    const { data: googleData, error: googleError } = await supabase
      .from('google_tokens')
      .select('access_token')
      .eq('telegram_id', telegram_id)
      .maybeSingle();

    if (googleError) {
      console.warn('⚠️ Ошибка при проверке Google Fit:', googleError.message);
    }

    const google_connected = !!googleData?.access_token;

    // ✅ Возвращаем профиль с флагом google_connected
    return res.status(200).json({
      ok: true,
      user: {
        ...user,
        google_connected
      }
    });

  } catch (error) {
    console.error('❌ /api/profile INTERNAL ERROR:', error.message);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

module.exports = router;
