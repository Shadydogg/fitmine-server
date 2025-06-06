const supabase = require('./supabase');

/**
 * Сохраняет или обновляет активность пользователя
 * @param {number} telegram_id
 * @param {object} data { steps, calories, active_minutes, distance, source }
 * @returns {Promise<{ error: any, ep: number, doubleGoal: boolean, goals: object, percentages: object }>}
 */
async function storeUserActivity(telegram_id, data) {
  const today = new Date().toISOString().slice(0, 10);

  const steps = data.steps || 0;
  const calories = data.calories || 0;
  const active_minutes = data.active_minutes || 0;
  const distance = data.distance || 0;
  const distance_km = distance / 1000;

  // Получаем текущий режим: double_goal?
  const { data: activityRecord, error: fetchError } = await supabase
    .from("user_activity")
    .select("double_goal")
    .eq("telegram_id", telegram_id)
    .eq("date", today)
    .maybeSingle();

  const doubleGoal = activityRecord?.double_goal || false;

  // 🎯 Целевые значения
  const multiplier = doubleGoal ? 2 : 1;
  const stepsGoal = 10000 * multiplier;
  const caloriesGoal = 2000 * multiplier;
  const distanceGoal = 5 * multiplier;
  const minutesGoal = 45 * multiplier;

  // 📊 Прогресс
  const stepsPercent = Math.min(steps / stepsGoal, 1);
  const caloriesPercent = Math.min(calories / caloriesGoal, 1);
  const distancePercent = Math.min(distance_km / distanceGoal, 1);
  const minutesPercent = Math.min(active_minutes / minutesGoal, 1);

  // 🔢 EP
  const ep = Math.round(
    (stepsPercent + caloriesPercent + distancePercent + minutesPercent) * 250
  );

  // 🔐 Сохраняем в Supabase
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
      double_goal: doubleGoal, // сохраняем флаг
      source: data.source || 'google_fit',
      updated_at: new Date().toISOString()
    }, {
      onConflict: ['telegram_id', 'date']
    });

  console.log("📥 [storeUserActivity] Активность сохранена", {
    telegram_id,
    date: today,
    ep,
    doubleGoal
  });

  return {
    error,
    ep,
    doubleGoal,
    goals: { stepsGoal, caloriesGoal, distanceGoal, minutesGoal },
    percentages: { stepsPercent, caloriesPercent, distancePercent, minutesPercent }
  };
}

module.exports = storeUserActivity;
