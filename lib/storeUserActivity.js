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

  // 📥 Получаем текущую запись активности
  const { data: activityRecord, error: fetchError } = await supabase
    .from("user_activity")
    .select("ep, double_goal")
    .eq("telegram_id", telegram_id)
    .eq("date", today)
    .maybeSingle();

  const doubleGoal = activityRecord?.double_goal || false;
  const epRewardClaimed = activityRecord?.ep_reward_claimed || false;

  // 🎯 Цели для отображения (визуально могут быть удвоены)
  const multiplier = doubleGoal ? 2 : 1;
  const stepsGoal = 10000 * multiplier;
  const caloriesGoal = 2000 * multiplier;
  const distanceGoal = 5 * multiplier;
  const minutesGoal = 45 * multiplier;

  // 🔢 EP вычисляется ТОЛЬКО если double_goal === false
  const shouldRecalculateEP = !doubleGoal;
  const stepsPercent = Math.min(steps / 10000, 1);
  const caloriesPercent = Math.min(calories / 2000, 1);
  const distancePercent = Math.min(distance_km / 5, 1);
  const minutesPercent = Math.min(active_minutes / 45, 1);
  const ep = shouldRecalculateEP
    ? Math.round((stepsPercent + caloriesPercent + distancePercent + minutesPercent) * 250)
    : activityRecord?.ep ?? 0;

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
      double_goal: doubleGoal,
      source: data.source || 'google_fit',
      updated_at: new Date().toISOString()
    }, {
      onConflict: ['telegram_id', 'date']
    });

  return { error };
}

module.exports = storeUserActivity;
