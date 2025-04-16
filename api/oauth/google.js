const { parse } = require('@telegram-apps/init-data-node');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.location.read',
  'https://www.googleapis.com/auth/fitness.body.read'
].join(' ');

module.exports = async (req, res) => {
  try {
    const { state } = req.query;

    if (!state) {
      return res.status(400).json({ ok: false, error: 'Missing Telegram initData' });
    }

    // 🔓 Декодируем initData из base64 → распарсим
    const initDataRaw = Buffer.from(state, 'base64').toString();
    const parsed = parse(initDataRaw);
    const telegramId = parsed?.user?.id;

    if (!telegramId) {
      return res.status(400).json({ ok: false, error: 'Invalid initData: no telegram_id' });
    }

    // 🔐 Шифруем telegram_id в state (в виде base64)
    const encodedTelegramId = Buffer.from(`${telegramId}`).toString('base64');

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', CLIENT_ID);
    url.searchParams.set('redirect_uri', REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('scope', GOOGLE_SCOPES);
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', encodedTelegramId); // будет расшифрован в callback.js

    return res.redirect(url.toString());
  } catch (err) {
    console.error('❌ Google OAuth Error:', err.message);
    return res.status(500).json({ ok: false, error: 'Google OAuth init failed' });
  }
};
