// index.js — v2.4.8
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// ✅ Подгружаем секреты из Render
dotenv.config({ path: '/etc/secrets/.env' });

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Supabase SDK версия
const { version: supabaseVersion } = require('@supabase/supabase-js/package.json');

// ✅ Основные маршруты API
const verifyTelegram = require('./api/verifyTelegram');
const profile = require('./api/profile');
const sync = require('./api/sync');
const refresh = require('./api/refresh'); // ⬅️ новый endpoint
const bot = require('./bot/bot'); // Telegram Webhook бот

// 📌 API роутинг
app.use('/api/verifyTelegram', verifyTelegram);
app.use('/api/profile', profile);
app.use('/api/sync', sync);
app.use('/api/refresh', refresh); // ⬅️ новое подключение

// ✅ Telegram Webhook endpoint с защитой от краша
app.post('/webhook', express.json(), (req, res) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Ошибка Webhook Telegram:', err);
    res.sendStatus(500);
  }
});

// ✅ Статус сервера и версия
app.get('/', (req, res) => {
  res.status(200).json({
    ok: true,
    version: 'FitMine Server v2.4.8',
    supabase: `Supabase SDK v${supabaseVersion}`,
    api: [
      '/api/verifyTelegram',
      '/api/profile',
      '/api/sync',
      '/api/refresh',
      '/webhook'
    ],
    message: 'Telegram Webhook активен ✅, Supabase подключён 🚀'
  });
});

// ✅ Запуск сервера
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 FitMine Server v2.4.8 running on port ${PORT}`);
  console.log(`🧩 Using Supabase SDK v${supabaseVersion}`);
});
