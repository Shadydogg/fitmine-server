// /lib/storeGoogleToken.js — v2.1.0
const supabase = require('./supabase');

/**
 * Сохраняет Google токены в таблицу google_tokens
 * и обновляет флаг google_connected в таблице users
 * @param {string} telegram_id
 * @param {object} tokens — { access_token, refresh_token, scope, token_type, expires_in }
 * @returns {Promise<{ error: any }>}
 */
async function storeGoogleToken(telegram_id, tokens) {
  if (!telegram_id || !tokens?.access_token) {
    console.error('❌ storeGoogleToken: Отсутствуют обязательные данные');
    return { error: 'Missing telegram_id or access_token' };
  }

  const expire_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // 💾 Сохраняем токены в google_tokens
  const { error: tokenError } = await supabase
    .from('google_tokens')
    .upsert({
      telegram_id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expire_at,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'telegram_id' // ❗️ Требует UNIQUE constraint!
    });

  if (tokenError) {
    console.error('❌ storeGoogleToken: Ошибка Supabase при токенах:', tokenError);
    return { error: tokenError };
  }

  // ✅ Обновляем флаг google_connected в таблице users
  const { error: userError } = await supabase
    .from('users')
    .update({ google_connected: true })
    .eq('telegram_id', telegram_id);

  if (userError) {
    console.error('⚠️ storeGoogleToken: Не удалось обновить google_connected:', userError);
    return { error: userError };
  }

  console.log(`✅ storeGoogleToken: Токены сохранены и google_connected = true для ${telegram_id}`);
  return { error: null };
}

module.exports = storeGoogleToken;
