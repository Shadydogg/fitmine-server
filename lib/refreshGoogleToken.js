const axios = require('axios');
const supabase = require('./supabase');

/**
 * Обновляет access_token по refresh_token.
 * При ошибке invalid_grant автоматически удаляет refresh_token.
 * @param {string} telegram_id
 * @returns {Promise<{ access_token?: string, error?: string }>}
 */
async function refreshGoogleToken(telegram_id) {
  const { data, error: tokenError } = await supabase
    .from('google_tokens')
    .select('refresh_token')
    .eq('telegram_id', telegram_id)
    .maybeSingle();

  if (tokenError || !data?.refresh_token) {
    return { error: 'Refresh token not found' };
  }

  const refresh_token = data.refresh_token;

  try {
    const res = await axios.post(
      'https://oauth2.googleapis.com/token',
      null,
      {
        params: {
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, expires_in, scope, token_type } = res.data;
    const expire_at = new Date(Date.now() + expires_in * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('google_tokens')
      .update({
        access_token,
        scope,
        token_type,
        expire_at,
        updated_at: new Date().toISOString(),
      })
      .eq('telegram_id', telegram_id);

    if (updateError) {
      return { error: 'Failed to update new token' };
    }

    return { access_token };

  } catch (err) {
    const isInvalidGrant = err.response?.data?.error === 'invalid_grant';

    if (isInvalidGrant) {
      console.warn('⚠️ refresh_token больше не валиден. Удаляем запись из Supabase...');

      await supabase
        .from('google_tokens')
        .delete()
        .eq('telegram_id', telegram_id);

      return { error: 'refresh_token revoked or expired' };
    }

    console.error('❌ Ошибка обновления токена Google:', err.response?.data || err.message);
    return { error: 'Google token refresh failed' };
  }
}

module.exports = refreshGoogleToken;
