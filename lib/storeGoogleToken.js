// lib/storeGoogleToken.js
const supabase = require('./supabase');

/**
 * Сохраняет Google токены в таблицу google_tokens
 * @param {string} telegram_id
 * @param {object} tokens — { access_token, refresh_token, scope, token_type, expires_in }
 * @returns {Promise<{ error: any }>}
 */
async function storeGoogleToken(telegram_id, tokens) {
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

  return { error };
}

module.exports = storeGoogleToken;
