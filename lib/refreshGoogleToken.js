const axios = require('axios');
const supabase = require('./supabase');

async function refreshGoogleToken(telegram_id) {
  if (!telegram_id) {
    return { error: 'Missing telegram_id' };
  }

  const { data, error: tokenError } = await supabase
    .from('google_tokens')
    .select('refresh_token')
    .eq('telegram_id', telegram_id)
    .maybeSingle();

  if (tokenError || !data?.refresh_token) {
    console.warn('⚠️ refresh_token отсутствует для:', telegram_id);
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
        expires_in,
        expire_at, // ✅ соответствует текущей структуре таблицы
        updated_at: new Date().toISOString(),
      })
      .eq('telegram_id', telegram_id);

    if (updateError) {
      console.error('❌ Ошибка обновления токена в Supabase:', updateError);
      return { error: 'Failed to update new token' };
    }

    console.log(`✅ Google access_token обновлён для ${telegram_id}`);
    return { access_token };

  } catch (err) {
    const isInvalidGrant = err.response?.data?.error === 'invalid_grant';

    if (isInvalidGrant) {
      console.warn('⚠️ refresh_token просрочен или отозван — удаляем');

      await supabase
        .from('google_tokens')
        .delete()
        .eq('telegram_id', telegram_id);

      return { error: 'refresh_token revoked or expired' };
    }

    console.error('❌ Ошибка обновления Google токена:', err.response?.data || err.message);
    return { error: 'Google token refresh failed' };
  }
}

module.exports = refreshGoogleToken;