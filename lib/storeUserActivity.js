// storeUserActivity.js — v3.2.0
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
    .select("ep, double_goal, ep_reward_claimed")
    .eq("telegram_id", telegram_id)
    .eq("date", today)
    .maybeSingle();

  if (fetchError) {
    console.error("❌ storeUserActivity: Ошибка запроса активности:", fetchError);
    return { error: fetchError };
  }

  const doubleGoal = activityRecord?.double_goal || false;
  const existingEP = activityRecord?.ep || 0;

  // 🔢 EP пересчитывается только если double_goal = false
  let newEP = existingEP;

  if (!doubleGoal) {
    const stepsPercent = Math.min(steps / 10000, 1);
    const caloriesPercent = Math.min(calories / 2000, 1);
    const distancePercent = Math.min(distance_km / 5, 1);
    const minutesPercent = Math.min(active_minutes / 45, 1);

    newEP = Math.round((stepsPercent + caloriesPercent + distancePercent + minutesPercent) * 250);
  }

  console.log("📥 [storeUserActivity] Сохраняем активность:", {
    telegram_id,
    steps,
    calories,
    active_minutes,
    distance,
    distance_km,
    ep: newEP,
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
      ep: newEP,
      double_goal: doubleGoal,
      source: data.source || 'google_fit',
      updated_at: new Date().toISOString()
    }, {
      onConflict: ['telegram_id', 'date']
    });

  return { error };
}

module.exports = storeUserActivity;