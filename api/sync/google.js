const supabase = require('../../lib/supabase');
const axios = require('axios');
const { parse } = require('@telegram-apps/init-data-node');
const jwt = require('jsonwebtoken');
const storeUserActivity = require('../../lib/storeUserActivity'); // ✅

const GOOGLE_DATA_SOURCE = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate';

module.exports = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [type, token] = authHeader.split(' ');

    let telegram_id = null;

    if (type === 'Bearer') {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      telegram_id = payload.telegram_id;
    } else if (type === 'tma') {
      const data = parse(token);
      telegram_id = data.user?.id;
    }

    if (!telegram_id) {
      return res.status(401).json({ ok: false, error: 'Не удалось определить telegram_id' });
    }

    // 🔐 Получаем Google access_token
    const { data, error } = await supabase
      .from('google_tokens')
      .select('access_token')
      .eq('telegram_id', telegram_id)
      .single();

    if (error || !data?.access_token) {
      return res.status(403).json({ ok: false, error: 'Google токен не найден' });
    }

    const access_token = data.access_token;

    // 📆 Время за сегодня
    const now = Date.now();
    const startTime = new Date();
    startTime.setHours(0, 0, 0, 0);

    const body = {
      aggregateBy: [
        { dataTypeName: "com.google.step_count.delta" },
        { dataTypeName: "com.google.calories.expended" },
        { dataTypeName: "com.google.active_minutes" },
        { dataTypeName: "com.google.distance.delta" },
      ],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startTime.getTime(),
      endTimeMillis: now
    };

    // 🔁 Запрос к Google Fit
    const fitRes = await axios.post(GOOGLE_DATA_SOURCE, body, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    });

    const buckets = fitRes.data.bucket?.[0]?.dataset || [];

    // 📊 Парсим значения
    let steps = 0, calories = 0, minutes = 0, distance = 0;

    for (const dataset of buckets) {
      const type = dataset.dataSourceId;
      const point = dataset.point?.[0];
      if (!point) continue;

      const val = point.value?.[0]?.intVal || point.value?.[0]?.fpVal || 0;

      if (type.includes('step_count')) steps = val;
      else if (type.includes('calories')) calories = val;
      else if (type.includes('active_minutes')) minutes = val;
      else if (type.includes('distance')) distance = val;
    }

    // 💾 Сохраняем в Supabase через storeUserActivity
    await storeUserActivity(telegram_id, {
      steps,
      calories,
      active_minutes: minutes,
      distance,
      source: 'google_fit'
    });

    return res.status(200).json({
      ok: true,
      steps,
      calories,
      minutes,
      distance,
      date: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ Ошибка синхронизации Google Fit:', err.message);
    return res.status(500).json({ ok: false, error: 'Google Fit sync error' });
  }
};
