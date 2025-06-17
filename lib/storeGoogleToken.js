// /lib/storeGoogleToken.js — v2.5.0
const supabase = require('./supabase');

/**
 * Сохраняет Google токены и обновляет флаг google_connected в users
 * @param {string} telegram_id
 * @param {object} tokens — { access_token, refresh_token?, scope, token_type, expires_in }
 * @returns {Promise<{ error: any }>}
 */
async function storeGoogleToken(telegram_id, tokens) {
  if (!telegram_id || !tokens?.access_token) {
    console.error('❌ storeGoogleToken: Отсутствуют обязательные данные');
    return { error: 'Missing telegram_id or access_token' };
  }

  const expire_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Получаем предыдущий refresh_token, если новый отсутствует
  const { data: existing, error: readError } = await supabase
    .from('google_tokens')
    .select('refresh_token')
    .eq('telegram_id', telegram_id)
    .maybeSingle();

  if (readError) {
    console.error('⚠️ storeGoogleToken: Ошибка чтения текущего токена:', readError);
  }

  const finalRefreshToken = tokens.refresh_token || existing?.refresh_token || null;

  if (!finalRefreshToken) {
    console.warn('⚠️ storeGoogleToken: refresh_token отсутствует и не найден в базе');
  }

  const { error: tokenError } = await supabase
    .from('google_tokens')
    .upsert({
      telegram_id,
      access_token: tokens.access_token,
      refresh_token: finalRefreshToken,
      scope: tokens.scope || '',
      token_type: tokens.token_type || 'Bearer',
      expire_at,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'telegram_id',
    });

  if (tokenError) {
    console.error('❌ [Supabase] Ошибка сохранения токенов:', tokenError);
    return { error: tokenError };
  }

  const { error: userError } = await supabase
    .from('users')
    .upsert({
      telegram_id,
      google_connected: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'telegram_id',
    });

  if (userError) {
    console.error('⚠️ [Supabase] Ошибка обновления users.google_connected:', userError);
    return { error: userError };
  }

  console.log(`✅ Google токены сохранены для ${telegram_id}, refresh_token: ${!!finalRefreshToken}`);
  return { error: null };
}

module.exports = storeGoogleToken;