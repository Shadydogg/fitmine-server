// /api/sync/google.js — v3.2.0
const supabase = require('../../lib/supabase');
const axios = require('axios');
const { parse } = require('@telegram-apps/init-data-node');
const jwt = require('jsonwebtoken');
const storeUserActivity = require('../../lib/storeUserActivity');
const refreshGoogleToken = require('../../lib/refreshGoogleToken');

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
      const initData = parse(token);
      telegram_id = initData.user?.id;
    }

    if (!telegram_id) {
      return res.status(401).json({ ok: false, error: 'Не удалось определить telegram_id' });
    }

    // 📦 Получение access_token и expire_at
    let { data: tokenData, error: tokenError } = await supabase
      .from('google_tokens')
      .select('access_token, expire_at')
      .eq('telegram_id', telegram_id)
      .maybeSingle();

    if (tokenError || !tokenData?.access_token) {
      return res.status(403).json({ ok: false, error: 'Google токен не найден' });
    }

    let access_token = tokenData.access_token;
    const isExpired = new Date(tokenData.expire_at).getTime() < Date.now();

    if (isExpired) {
      const { access_token: new_token, error: refreshError } = await refreshGoogleToken(telegram_id);
      if (!new_token) {
        console.warn('⚠️ Ошибка обновления токена:', refreshError);
        await supabase.from('google_tokens').delete().eq('telegram_id', telegram_id);
        return res.status(401).json({ ok: false, error: 'Google token expired', need_reauth: true });
      }
      access_token = new_token;
    }

    // ⏱️ Таймфрейм: сегодня
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
      endTimeMillis: now,
    };

    const fitRes = await axios.post(GOOGLE_DATA_SOURCE, body, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    });

    const buckets = fitRes.data.bucket?.[0]?.dataset || [];

    let steps = 0, calories = 0, minutes = 0, distance = 0;

    for (const dataset of buckets) {
      const points = dataset.point || [];
      for (const point of points) {
        const val = point.value?.[0]?.intVal ?? point.value?.[0]?.fpVal ?? 0;
        if (dataset.dataSourceId.includes('step_count')) steps += val;
        else if (dataset.dataSourceId.includes('calories')) calories += val;
        else if (dataset.dataSourceId.includes('active_minutes')) minutes += val;
        else if (dataset.dataSourceId.includes('distance')) distance += val;
      }
    }

    steps = Number(steps) || 0;
    calories = Number(calories) || 0;
    minutes = Number(minutes) || 0;
    distance = Number(distance) || 0;

    // 🧠 Получаем флаги активности
    const today = new Date().toISOString().slice(0, 10);
    const { data: currentActivity, error: fetchError } = await supabase
      .from('user_activity')
      .select('ep, double_goal, ep_frozen')
      .eq('telegram_id', telegram_id)
      .eq('date', today)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ Ошибка получения активности:", fetchError);
    }

    const doubleGoal = currentActivity?.double_goal || false;
    const epFrozen = currentActivity?.ep_frozen || false;
    const allowEPOverwrite = !(doubleGoal || epFrozen);

    if (!allowEPOverwrite) {
      console.log("🛡️ PowerBank или double_goal активны — EP защищён");
    }

    console.log('📊 Сохраняем активность:', {
      telegram_id, steps, calories, minutes, distance, allowEPOverwrite
    });

    const { error: saveError } = await storeUserActivity(telegram_id, {
      steps,
      calories,
      active_minutes: minutes,
      distance,
      source: 'google_fit',
      allowEPOverwrite,
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
      date: today,
    });

  } catch (err) {
    console.error('❌ Ошибка /api/sync/google:', err.message || err);
    return res.status(500).json({ ok: false, error: 'Google Fit sync error' });
  }
};