const supabase = require('../../lib/supabase');
const axios = require('axios');
const { parse } = require('@telegram-apps/init-data-node');
const jwt = require('jsonwebtoken');
const storeUserActivity = require('../../lib/storeUserActivity');
const refreshGoogleToken = require('../../lib/refreshGoogleToken'); // ✅ новое подключение

const GOOGLE_DATA_SOURCE = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate';

module.exports = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [type, token] = authHeader.split(' ');

    let telegram_id = null;

    if (type === 'Bearer') {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        telegram_id = payload.telegram_id;
      } catch {
        return res.status(401).json({ ok: false, error: 'Неверный JWT токен' });
      }
    } else if (type === 'tma') {
      try {
        const initData = parse(token);
        telegram_id = initData.user?.id;
      } catch {
        return res.status(401).json({ ok: false, error: 'Неверный initData' });
      }
    }

    if (!telegram_id) {
      return res.status(401).json({ ok: false, error: 'Не удалось определить telegram_id' });
    }

    // Получаем текущий access_token
    let { data: tokenData, error } = await supabase
      .from('google_tokens')
      .select('access_token')
      .eq('telegram_id', telegram_id)
      .single();

    if (error || !tokenData?.access_token) {
      return res.status(403).json({ ok: false, error: 'Google токен не найден' });
    }

    let access_token = tokenData.access_token;

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

    // 🔁 Запрос к Google Fit API (с автоматическим обновлением токена при 401)
    let fitRes;
    try {
      fitRes = await axios.post(GOOGLE_DATA_SOURCE, body, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.warn('⚠️ Access token просрочен, пробуем обновить...');
        const { access_token: new_token, error: refreshError } = await refreshGoogleToken(telegram_id);
        if (refreshError || !new_token) {
          return res.status(401).json({ ok: false, error: 'Google token refresh failed' });
        }

        access_token = new_token;

        // Повторный запрос
        fitRes = await axios.post(GOOGLE_DATA_SOURCE, body, {
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
        });
      } else {
        throw error;
      }
    }

    const buckets = fitRes.data.bucket?.[0]?.dataset || [];

    let steps = 0, calories = 0, minutes = 0, distance = 0;

    for (const dataset of buckets) {
      const point = dataset.point?.[0];
      if (!point) continue;

      const val = point.value?.[0]?.intVal || point.value?.[0]?.fpVal || 0;

      if (dataset.dataSourceId.includes('step_count')) steps = val;
      else if (dataset.dataSourceId.includes('calories')) calories = val;
      else if (dataset.dataSourceId.includes('active_minutes')) minutes = val;
      else if (dataset.dataSourceId.includes('distance')) distance = val;
    }

    console.log('📥 Сохраняем данные активности:', {
      telegram_id,
      steps,
      calories,
      active_minutes: minutes,
      distance
    });

    const { error: saveError } = await storeUserActivity(telegram_id, {
      steps,
      calories,
      active_minutes: minutes,
      distance,
      source: 'google_fit'
    });

    if (saveError) {
      console.error('❌ Ошибка сохранения активности:', saveError);
    }

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