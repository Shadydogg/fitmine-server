// /api/profile.js — v2.3.1
const express = require('express');
const supabase = require('../lib/supabase');
const verifyAccessToken = require('../lib/verifyAccessToken');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const payload = await verifyAccessToken(req);
    const telegram_id = payload.telegram_id;

    // 📥 Получаем пользователя
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*') // 💡 Выбираем всё как в v2.2.0
      .eq('telegram_id', telegram_id)
      .single();

    if (userError || !user) {
      console.error('❌ Supabase [users] error:', userError?.message || 'Not found');
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // 🔍 Проверяем наличие Google Fit
    const { data: googleData, error: googleError } = await supabase
      .from('google_tokens')
      .select('access_token, expire_at')
      .eq('telegram_id', telegram_id)
      .maybeSingle();

    if (googleError) {
      console.warn('⚠️ Ошибка при проверке Google Fit:', googleError.message);
    }

    const google_connected = !!googleData?.access_token &&
      (!googleData.expire_at || new Date(googleData.expire_at) > new Date());

    return res.status(200).json({
      ok: true,
      user: {
        ...user,
        google_connected,
      },
    });

  } catch (error) {
    console.error('❌ /api/profile JWT or Internal Error:', error.message);
    return res.status(401).json({ ok: false, error: error.message });
  }
});

module.exports = router;
