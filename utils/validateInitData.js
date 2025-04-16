// v2.0.0 — Telegram initData validation + clean logs + fallback to env
const crypto = require('crypto');

function validateInitData(initDataRaw, rawToken) {
  try {
    const botToken = (rawToken || process.env.BOT_TOKEN || '').trim();
    if (!botToken) {
      console.error('❌ BOT_TOKEN is empty or undefined');
      return { ok: false, error: 'BOT_TOKEN not set' };
    }

    console.log('🔐 BOT_TOKEN (trimmed):', botToken);

    const urlParams = new URLSearchParams(initDataRaw);
    const params = {};

    for (const [key, value] of urlParams.entries()) {
      params[key.trim()] = typeof value === 'string' ? value.trim() : value;
    }

    const receivedHash = params.hash;
    if (!receivedHash) return { ok: false, error: 'Missing hash' };
    delete params.hash;
    delete params.signature;

    const allowedKeys = ['auth_date', 'query_id', 'user'];
    const keys = Object.keys(params).filter(k => allowedKeys.includes(k)).sort();

    // 🧽 Удаляем экранированные слэши из user (user={"id":123,...})
    const rawUserMatch = initDataRaw.match(/user=({.*?})[&$]/);
    const rawUserString = rawUserMatch
      ? rawUserMatch[1].replace(/\\\//g, '/')
      : params.user;

    if (!rawUserString) return { ok: false, error: 'Raw user not found' };

    const data_check_string = keys
      .map(key => {
        if (key === 'user') return `user=${rawUserString}`;
        return `${key}=${params[key]}`;
      })
      .join('\n')
      .trim();

    const secret = crypto.createHash('sha256').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secret).update(data_check_string).digest('hex');

    console.log('🔍 data_check_string:', JSON.stringify(data_check_string));
    console.log('🧮 Computed hash:', computedHash);
    console.log('📥 Received hash:', receivedHash);

    if (computedHash !== receivedHash) {
      return { ok: false, error: 'Hash mismatch' };
    }

    let user;
    try {
      user = JSON.parse(params.user);
    } catch (err) {
      return { ok: false, error: 'Invalid user JSON' };
    }

    return { ok: true, user };
  } catch (err) {
    console.error('❌ Exception in validateInitData:', err.message || err);
    return { ok: false, error: 'Exception during validation' };
  }
}

module.exports = validateInitData;
