const supabase = require('./supabase');

/**
 * Сохраняет или обновляет активность пользователя
 * @param {number} telegram_id
 * @param {object} data { steps, calories, active_minutes, distance, source }
 * @returns {Promise<{ error: any }>}}
 */
async function storeUserActivity(telegram_id, data) {
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

  const steps = data.steps || 0;
  const calories = data.calories || 0;
  const active_minutes = data.active_minutes || 0;
  const distance = data.distance || 0;
  const distance_km = distance / 1000;

  const epRaw =
    (steps / 100) +
    (calories / 10) +
    (active_minutes * 2) +
    (distance_km * 10);

  const ep = Math.round(epRaw); // ✅ округление к целому числу

  console.log("📥 [storeUserActivity] Сохраняем активность:", {
    telegram_id,
    steps,
    calories,
    active_minutes,
    distance,
    distance_km,
    ep,
    source: data.source || 'google_fit',
    date: today
  });

  const { error } = await supabase
    .from('user_activity')
    .upsert({
      telegram_id,
      date: today,
      steps,
      calories,
      active_minutes,
      distance,
      ep,
      source: data.source || 'google_fit',
      updated_at: new Date().toISOString()
    }, {
      onConflict: ['telegram_id', 'date']
    });

  return { error };
}

module.exports = storeUserActivity;
