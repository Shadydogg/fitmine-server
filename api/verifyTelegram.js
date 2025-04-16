// ✅ v3.3.0 — Telegram verify + Access + Refresh + jti
const { validate, parse } = require('@telegram-apps/init-data-node');
const supabase = require('../lib/supabase');
const { generateTokens } = require('../lib/jwt'); // ⬅️ Новый модуль

const BOT_TOKEN = process.env.BOT_TOKEN;

module.exports = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [authType, authData] = authHeader.split(' ');

    if (authType !== 'tma' || !authData) {
      return res.status(401).json({ ok: false, error: 'Missing or invalid Authorization header' });
    }

    // 🛡️ Проверка подписи Telegram
    validate(authData, BOT_TOKEN.trim(), { expiresIn: 3600 });
    const initData = parse(authData);
    const user = initData.user;

    console.log('✅ Подпись Telegram корректна!');
    console.log('👤 Пользователь:', user);

    // 🗃️ Обновляем или вставляем пользователя
    const { error } = await supabase
      .from('users')
      .upsert({
        telegram_id: user.id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        photo_url: user.photo_url || '',
        language_code: user.language_code || 'en',
        is_premium: user.is_premium ?? false,
        allows_write_to_pm: user.allows_write_to_pm ?? false
      }, {
        onConflict: 'telegram_id'
      });

    if (error) {
      console.error('❌ Supabase вставка не удалась!');
      console.error('🛠️ Код:', error.code);
      console.error('📄 Детали:', error.details);
      return res.status(500).json({ ok: false, error: 'Supabase error', detail: error.message });
    }

    console.log(`✅ Пользователь upsert выполнен: telegram_id=${user.id}`);

    // 🔐 Генерируем access + refresh токены
    const { access_token, refresh_token, jti } = generateTokens({ telegram_id: user.id });

    // 💾 Сохраняем jti в token_sessions (можно расширить: user_agent, ip, platform и т.д.)
    const { error: sessionError } = await supabase
      .from('token_sessions')
      .insert({
        telegram_id: user.id,
        jti,
        created_at: new Date().toISOString(),
        revoked: false
      });

    if (sessionError) {
      console.error('⚠️ Ошибка при сохранении сессии:', sessionError.message);
      // ❗ Не прерываем, продолжаем — но можно добавить лог
    }

    // 📤 Возвращаем все токены и пользователя
    return res.status(200).json({
      ok: true,
      user,
      access_token,
      refresh_token,
      initData
    });

  } catch (error) {
    console.error('❌ Ошибка в verifyTelegram:', error.message);
    return res.status(401).json({ ok: false, error: 'Invalid signature or expired initData' });
  }
};
