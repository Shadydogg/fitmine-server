const supabase = require('./supabase');

/**
 * Сохраняет Google токены в таблицу google_tokens
 * @param {string} telegram_id
 * @param {{
 *   access_token: string,
 *   refresh_token: string,
 *   scope: string,
 *   token_type: string,
 *   expires_in: number
 * }} tokens
 * @returns {Promise<{ error: any }>}
 */
async function storeGoogleToken(telegram_id, tokens) {
  if (!telegram_id || !tokens?.access_token) {
    console.error('❌ storeGoogleToken: Отсутствуют обязательные данные');
    return { error: 'Missing telegram_id or access_token' };
  }

  const expire_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error } = await supabase
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
      onConflict: 'telegram_id'
    });

  if (error) {
    console.error('❌ storeGoogleToken: Ошибка Supabase:', error);
  }

  return { error };
}

module.exports = storeGoogleToken;
