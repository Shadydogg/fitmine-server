const supabase = require('./supabase');

/**
 * Сохраняет или обновляет активность пользователя
 * @param {number} telegram_id
 * @param {object} data { steps, calories, active_minutes, distance, source }
 * @returns {Promise<{ error: any }>}
 */
async function storeUserActivity(telegram_id, data) {
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

  const steps = data.steps || 0;
  const calories = data.calories || 0;
  const active_minutes = data.active_minutes || 0;
  const distance = data.distance || 0;
  const distance_km = distance / 1000;

  // 🎯 Целевые значения
  const stepsGoal = 10000;
  const caloriesGoal = 2000;
  const distanceGoal = 5;
  const minutesGoal = 45;

  // 📊 Прогресс по каждой метрике
  const stepsPercent = Math.min(steps / stepsGoal, 1);
  const caloriesPercent = Math.min(calories / caloriesGoal, 1);
  const distancePercent = Math.min(distance_km / distanceGoal, 1);
  const minutesPercent = Math.min(active_minutes / minutesGoal, 1);

  // 🔢 Итоговое значение EP (4 метрики × 250 EP = максимум 1000 EP)
  const ep = Math.round(
    (stepsPercent + caloriesPercent + distancePercent + minutesPercent) * 250
  );

  console.log("📥 [storeUserActivity] Сохраняем активность:", {
    telegram_id,
    steps,
    calories,
    active_minutes,
    distance,
    distance_km,
    stepsPercent,
    caloriesPercent,
    distancePercent,
    minutesPercent,
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
