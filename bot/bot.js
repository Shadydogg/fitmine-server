// bot/bot.js — v1.2.0 (Telegram Webhook)
const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = 'https://fitmine.vip/tgapp';
const HOST_URL = process.env.API_HOST || 'https://api.fitmine.vip'; // Render backend URL

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN не задан.");
  process.exit(1);
}

// ✅ Инициализация в webhook-режиме
const bot = new TelegramBot(BOT_TOKEN, {
  webHook: { port: false } // отключим локальный listener
});

// ✅ Устанавливаем webhook (например, https://api.fitmine.vip/webhook)
bot.setWebHook(`${HOST_URL}/webhook`)
  .then(() => console.log(`🔗 Webhook установлен: ${HOST_URL}/webhook`))
  .catch(err => console.error('❌ Ошибка установки webhook:', err));

// ✅ Обработка команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const name = msg.from?.first_name || 'пользователь';

  console.log(`📩 /start от ${name} (${chatId})`);

  bot.sendMessage(chatId, '👋 Привет! Нажми кнопку ниже, чтобы открыть мини-приложение FitMine:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🚀 Открыть FitMine',
            web_app: { url: WEB_APP_URL }
          }
        ]
      ]
    }
  });
});

module.exports = bot;
