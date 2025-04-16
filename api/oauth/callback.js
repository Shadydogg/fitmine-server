const axios = require('axios');
const storeGoogleToken = require('../../lib/storeGoogleToken');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

module.exports = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ ok: false, error: 'Missing code or state' });
    }

    // 🔓 Расшифровываем telegram_id
    const telegram_id = Buffer.from(state, 'base64').toString();

    // 🔁 Обмен кода на access_token
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

    // 💾 Сохраняем токены в отдельной таблице google_tokens
    const { error } = await storeGoogleToken(telegram_id, {
      access_token,
      refresh_token,
      scope,
      token_type,
      expires_in,
    });

    if (error) {
      console.error('❌ Ошибка Supabase при сохранении токенов:', error);
      return res.status(500).json({ ok: false, error: 'Supabase token insert error' });
    }

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
    console.error('❌ Ошибка OAuth Callback:', err.response?.data || err.message);
    return res.status(500).json({ ok: false, error: 'OAuth callback failed' });
  }
};
