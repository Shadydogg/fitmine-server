const supabase = require('./supabase');

/**
 * Сохраняет или обновляет активность пользователя
 * @param {number} telegram_id
 * @param {object} data { steps, calories, active_minutes, distance, source }
 * @returns {Promise<{ error: any }>}
 */
async function storeUserActivity(telegram_id, data) {
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

  const { error } = await supabase
    .from('user_activity')
    .upsert({
      telegram_id,
      date: today,
      steps: data.steps || 0,
      calories: data.calories || 0,
      active_minutes: data.active_minutes || 0,
      distance: data.distance || 0,
      source: data.source || 'google_fit',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'telegram_id, date'
    });

  return { error };
}

module.exports = storeUserActivity;
