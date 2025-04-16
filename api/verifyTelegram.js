// ✅ v2.6.5 — Debug Upsert + Token
const { validate, parse } = require('@telegram-apps/init-data-node');
const supabase = require('../lib/supabase');
const jwt = require('jsonwebtoken');

const BOT_TOKEN = process.env.BOT_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || 'fitmine_super_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

module.exports = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [authType, authData] = authHeader.split(' ');

    if (authType !== 'tma' || !authData) {
      return res.status(401).json({ ok: false, error: 'Missing or invalid Authorization header' });
    }

    validate(authData, BOT_TOKEN.trim(), { expiresIn: 3600 });
    const initData = parse(authData);
    const user = initData.user;

    console.log('✅ Подпись Telegram корректна!');
    console.log('👤 Пользователь:', user);

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

    const access_token = jwt.sign({ telegram_id: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    return res.status(200).json({ ok: true, user, access_token });

  } catch (error) {
    console.error('❌ Ошибка в verifyTelegram:', error.message);
    return res.status(401).json({ ok: false, error: 'Invalid signature or expired initData' });
  }
};
