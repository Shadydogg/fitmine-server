const express = require('express');
const { verifyToken, generateTokens } = require('../lib/jwt');
const supabase = require('../lib/supabase');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh_token' });
    }

    const { telegram_id, jti: oldJti } = payload;

    const { data: session, error: sessionError } = await supabase
      .from('token_sessions')
      .select('*')
      .eq('jti', oldJti)
      .eq('telegram_id', telegram_id)
      .eq('revoked', false)
      .maybeSingle();

    if (sessionError || !session) {
      return res.status(403).json({ error: 'Session revoked or not found' });
    }

    const { access_token, refresh_token, jti: newJti } = generateTokens({ telegram_id });

    if (!access_token || !refresh_token || !newJti) {
      return res.status(500).json({ error: 'Token generation failed' });
    }

    const { error: revokeError } = await supabase
      .from('token_sessions')
      .update({ revoked: true })
      .eq('jti', oldJti)
      .eq('telegram_id', telegram_id);

    if (revokeError) {
      console.warn('⚠️ Ошибка при ревокации старой сессии:', revokeError);
    }

    const { error: insertError } = await supabase
      .from('token_sessions')
      .insert({
        telegram_id,
        jti: newJti,
        created_at: new Date().toISOString(),
        revoked: false
      });

    if (insertError) {
      console.warn('⚠️ Ошибка при вставке новой сессии:', insertError);
    }

    return res.status(200).json({
      ok: true,
      access_token,
      refresh_token
    });

  } catch (err) {
    console.error('❌ Ошибка в /api/refresh:', err.message);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
});

module.exports = router;