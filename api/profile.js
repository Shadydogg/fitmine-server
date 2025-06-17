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
      .select('*')
      .eq('telegram_id', telegram_id)
      .single();

    if (userError || !user) {
      console.error('❌ Supabase [users] error:', userError?.message || 'Not found');
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // 🔍 Проверяем состояние подключения Google Fit
    const { data: googleData, error: googleError } = await supabase
      .from('google_tokens')
      .select('access_token, expire_at, refresh_token')
      .eq('telegram_id', telegram_id)
      .maybeSingle();

    if (googleError) {
      console.warn('⚠️ Ошибка при получении Google токенов:', googleError.message);
    }

    const now = Date.now();
    const expire_at_ts = googleData?.expire_at ? new Date(googleData.expire_at).getTime() : 0;
    const isExpired = expire_at_ts > 0 && expire_at_ts < now;
    const hasRefresh = !!googleData?.refresh_token;

    const google_connected = !!googleData?.access_token && (!isExpired || hasRefresh);
    const google_needs_reauth = isExpired && !hasRefresh;

    // ✅ Возвращаем результат
    return res.status(200).json({
      ok: true,
      user: {
        ...user,
        google_connected,
        google_needs_reauth,
      },
    });

  } catch (error) {
    console.error('❌ /api/profile JWT or Internal Error:', error.message);
    return res.status(401).json({ ok: false, error: error.message });
  }
});

module.exports = router;