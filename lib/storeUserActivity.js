const supabase = require('./supabase');

/**
 * Сохраняет или обновляет активность пользователя
 * @param {number} telegram_id
 * @param {object} data { steps, calories, active_minutes, distance, source }
 * @returns {Promise<{ error: any }>}
 */
async function storeUserActivity(telegram_id, data) {
  const today = new Date().toISOString().slice(0, 10);

  const steps = data.steps || 0;
  const calories = data.calories || 0;
  const active_minutes = data.active_minutes || 0;
  const distance = data.distance || 0;
  const distance_km = distance / 1000;

  // 📥 Получаем double_goal, чтобы применить визуально
  const { data: activityRecord, error: fetchError } = await supabase
    .from("user_activity")
    .select("double_goal")
    .eq("telegram_id", telegram_id)
    .eq("date", today)
    .maybeSingle();

  const doubleGoal = activityRecord?.double_goal || false;

  // 🎯 Целевые значения активности (для отображения в интерфейсе)
  const multiplier = doubleGoal ? 2 : 1;
  const stepsGoal = 10000 * multiplier;
  const caloriesGoal = 2000 * multiplier;
  const distanceGoal = 5 * multiplier;
  const minutesGoal = 45 * multiplier;

  // 🔢 EP всегда считается от БАЗОВЫХ целей, без doubleGoal
  const stepsPercent = Math.min(steps / 10000, 1);
  const caloriesPercent = Math.min(calories / 2000, 1);
  const distancePercent = Math.min(distance_km / 5, 1);
  const minutesPercent = Math.min(active_minutes / 45, 1);
  const ep = Math.round((stepsPercent + caloriesPercent + distancePercent + minutesPercent) * 250);

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
    doubleGoal,
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
