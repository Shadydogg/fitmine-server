const supabase = require('./supabase');

async function storeGoogleToken(telegram_id, tokens) {
  if (!telegram_id || !tokens?.access_token || !tokens?.refresh_token) {
    console.error('❌ storeGoogleToken: Отсутствуют обязательные токены');
    return { error: 'Missing access_token or refresh_token' };
  }

  const expire_at = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error: tokenError } = await supabase
    .from('google_tokens')
    .upsert({
      telegram_id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope || '',
      token_type: tokens.token_type || 'Bearer',
      expire_at, // ✅ только это поле нужно сохранять
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

  console.log(`✅ Google токены сохранены и флаг google_connected установлен для ${telegram_id}`);
  return { error: null };
}

module.exports = storeGoogleToken;