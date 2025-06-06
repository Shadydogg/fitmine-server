// index.js — v2.6.4
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// ✅ Подгружаем переменные окружения из Render
dotenv.config({ path: '/etc/secrets/.env' });

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Supabase SDK версия
const { version: supabaseVersion } = require('@supabase/supabase-js/package.json');

// ✅ Импорт маршрутов
const verifyTelegram = require('./api/verifyTelegram');
const profile = require('./api/profile');
const sync = require('./api/sync');
const refresh = require('./api/refresh');
const oauthCallback = require('./api/oauth/callback');
const syncGoogle = require('./api/sync/google');
const nft = require('./api/nft');
const nftUpgrade = require('./api/nft/upgrade');
const land = require('./api/land');
const landUpdate = require('./api/land/update');
const landCreate = require('./api/land/create');
const epHandler = require('./api/ep');
const epClaim = require('./api/ep/claim');
const boosters = require('./api/boosters');
const bot = require('./bot/bot');

// ✅ PowerBank API
const powerbankIndex = require('./api/powerbanks/index'); // ← Новый маршрут
const powerbankUse = require('./api/powerbanks/use');
const powerbankStats = require('./api/powerbanks/stats');

// ✅ Подключение маршрутов
app.use('/api/verifyTelegram', verifyTelegram);
app.use('/api/profile', profile);
app.use('/api/sync', sync);
app.use('/api/refresh', refresh);
app.get('/api/oauth/callback', oauthCallback);
app.post('/api/sync/google', syncGoogle);
app.use('/api/nft', nft);
app.post('/api/nft/upgrade', nftUpgrade);
app.use('/api/land', land);
app.post('/api/land/update', landUpdate);
app.post('/api/land/create', landCreate);
app.use('/api/boosters', boosters);

// ✅ EP API
app.get('/api/ep', epHandler);
app.post('/api/ep/claim', epClaim);

// ✅ PowerBank маршруты
app.get('/api/powerbanks', powerbankIndex); // ✅ Новый
app.post('/api/powerbanks/use', powerbankUse);
app.get('/api/powerbanks/stats', powerbankStats);

// ✅ Webhook от Telegram Bot API
app.post('/webhook', express.json(), (req, res) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Ошибка Webhook Telegram:', err);
    res.sendStatus(500);
  }
});

// ✅ Тестовый маршрут для проверки статуса сервера
app.get('/', (req, res) => {
  res.status(200).json({
    ok: true,
    version: 'FitMine Server v2.6.4',
    supabase: `Supabase SDK v${supabaseVersion}`,
    api: [
      '/api/verifyTelegram',
      '/api/profile',
      '/api/sync',
      '/api/refresh',
      '/api/oauth/callback',
      '/api/sync/google',
      '/api/nft',
      '/api/nft/upgrade',
      '/api/land',
      '/api/land/update',
      '/api/land/create',
      '/api/boosters',
      '/api/ep',
      '/api/ep/claim',
      '/api/powerbanks',
      '/api/powerbanks/use',
      '/api/powerbanks/stats',
      '/webhook'
    ],
    message: 'Telegram Webhook активен ✅, Supabase подключён 🚀'
  });
});

// ✅ Запуск сервера
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 FitMine Server v2.6.4 запущен на порту ${PORT}`);
  console.log(`🧩 Supabase SDK: v${supabaseVersion}`);
  console.log(`✅ Telegram Webhook готов к приёму`);

  console.log(`📡 Доступные API маршруты:`);
  [
    '/api/verifyTelegram',
    '/api/profile',
    '/api/sync',
    '/api/refresh',
    '/api/oauth/callback',
    '/api/sync/google',
    '/api/nft',
    '/api/nft/upgrade',
    '/api/land',
    '/api/land/update',
    '/api/land/create',
    '/api/boosters',
    '/api/ep',
    '/api/ep/claim',
    '/api/powerbanks',
    '/api/powerbanks/use',
    '/api/powerbanks/stats',
    '/webhook'
  ].forEach(route => console.log(`🔹 ${route}`));
});
