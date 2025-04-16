const axios = require('axios');
const storeGoogleToken = require('../../lib/storeGoogleToken');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

module.exports = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      console.warn('⚠️ code или state отсутствует:', { code, state });
      return res.status(400).json({ ok: false, error: 'Missing code or state' });
    }

    // 🔓 Расшифровываем telegram_id из state
    const telegram_id = Buffer.from(state, 'base64').toString();

    if (!telegram_id || telegram_id.length < 3) {
      console.warn('⚠️ Ошибка декодинга telegram_id:', telegram_id);
      return res.status(400).json({ ok: false, error: 'Invalid telegram_id' });
    }

    console.log(`🔐 [OAuth Callback] telegram_id: ${telegram_id}`);

    // 🔁 Запрос токенов Google
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        code,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const {
      access_token,
      refresh_token,
      expires_in,
      scope,
      token_type,
    } = tokenRes.data;

    console.log('✅ [Google] Токены получены:', {
      access_token: access_token?.slice(0, 10) + '...',
      refresh_token: refresh_token?.slice(0, 10) + '...',
      scope,
      token_type,
      expires_in
    });

    // 💾 Сохраняем токены в Supabase
    const { error } = await storeGoogleToken(telegram_id, {
      access_token,
      refresh_token,
      scope,
      token_type,
      expires_in,
    });

    if (error) {
      console.error('❌ [Supabase] Ошибка сохранения токенов:', error);
      return res.status(500).json({ ok: false, error: 'Supabase token insert error' });
    }

    console.log('💾 [Supabase] Токены успешно сохранены');

    // ✅ HTML-ответ
    return res.send(`
      <html>
        <body style="text-align:center;font-family:sans-serif;">
          <h2>✅ Google Fit подключён!</h2>
          <p>Можешь вернуться в Telegram 🤖</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('❌ [OAuth Callback] Ошибка:', err.response?.data || err.message);
    return res.status(500).json({ ok: false, error: 'OAuth callback failed' });
  }
};
