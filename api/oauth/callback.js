const axios = require('axios');
const { validate, parse } = require('@telegram-apps/init-data-node');
const storeGoogleToken = require('../../lib/storeGoogleToken');
const supabase = require('../../lib/supabase');

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

    // ✅ Расшифровываем initDataRaw
    const initDataRaw = Buffer.from(state, 'base64').toString();

    // ✅ Проверяем подпись Telegram
    validate(initDataRaw, process.env.BOT_TOKEN);
    const parsed = parse(initDataRaw);
    const user = parsed?.user;
    const telegram_id = user?.id;

    if (!telegram_id) {
      console.warn('⚠️ Ошибка извлечения telegram_id:', parsed);
      return res.status(400).json({ ok: false, error: 'Invalid Telegram user' });
    }

    console.log(`🔐 [OAuth Callback] telegram_id: ${telegram_id}`);

    // 🔁 Запрос токенов у Google
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

    console.log('✅ [Google] Токены получены');

    // 💾 Сохраняем токены в Supabase
    const { error: tokenSaveError } = await storeGoogleToken(telegram_id, {
      access_token,
      refresh_token,
      scope,
      token_type,
      expires_in,
    });

    if (tokenSaveError) {
      console.error('❌ [Supabase] Ошибка сохранения токенов:', tokenSaveError);
      return res.status(500).json({ ok: false, error: 'Supabase token insert error' });
    }

    // 🔁 Обновляем users.google_connected = true
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ google_connected: true, updated_at: new Date().toISOString() })
      .eq('telegram_id', telegram_id);

    if (userUpdateError) {
      console.error('❌ [Supabase] Ошибка обновления пользователя:', userUpdateError);
    }

    console.log('💾 [Supabase] Токены и статус подключения успешно сохранены');

    // ✅ HTML-ответ
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="ru">
        <head>
          <meta charset="UTF-8" />
          <title>FitMine</title>
          <style>
            body {
              font-family: sans-serif;
              text-align: center;
              background: #000;
              color: #0f0;
              padding: 2rem;
            }
            h2 {
              font-size: 24px;
              margin-bottom: 1rem;
            }
          </style>
        </head>
        <body>
          <h2>✅ Google Fit подключён!</h2>
          <p>Можешь вернуться в Telegram 🤖</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 2500);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('❌ [OAuth Callback] Ошибка:', err.response?.data || err.message);
    return res.status(500).json({ ok: false, error: 'OAuth callback failed' });
  }
};
