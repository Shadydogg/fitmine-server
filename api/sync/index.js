const supabase = require('../../lib/supabase');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [type, token] = authHeader.split(' ');

    if (!token || (type.toLowerCase() !== 'bearer')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const telegram_id = payload.telegram_id;

    const today = new Date().toISOString().slice(0, 10);

    // 📦 user_activity
    const { data: activity, error: activityError } = await supabase
      .from('user_activity')
      .select('steps, calories, distance, active_minutes, ep, double_goal')
      .eq('telegram_id', telegram_id)
      .eq('date', today)
      .maybeSingle();

    if (activityError) {
      console.error("❌ Ошибка получения активности:", activityError);
      return res.status(500).json({ error: 'Failed to fetch activity' });
    }

    const doubleGoal = activity?.double_goal || false;
    const multiplier = doubleGoal ? 2 : 1;

    // 📦 users
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('is_premium')
      .eq('telegram_id', telegram_id)
      .single();

    if (userError) {
      console.warn("⚠️ Ошибка получения профиля пользователя:", userError.message);
    }

    // 📦 nft_miners
    const { data: nft, error: nftError } = await supabase
      .from('nft_miners')
      .select('id')
      .eq('telegram_id', telegram_id)
      .limit(1);

    if (nftError) {
      console.warn("⚠️ Ошибка получения NFT:", nftError.message);
    }

    // ⚡ user_powerbanks
    const { data: powerbanks, error: pbError } = await supabase
      .from('user_powerbanks')
      .select('id')
      .eq('telegram_id', telegram_id)
      .eq('used', false);

    if (pbError) {
      console.warn("⚠️ Ошибка получения PowerBanks:", pbError.message);
    }

    const powerbankCount = Array.isArray(powerbanks) ? powerbanks.length : 0;

    return res.status(200).json({
      steps: activity?.steps || 0,
      stepsGoal: 10000 * multiplier,
      calories: activity?.calories || 0,
      caloriesGoal: 2000 * multiplier,
      distance: activity?.distance || 0,
      distanceGoal: 5 * multiplier,
      minutes: activity?.active_minutes || 0,
      minutesGoal: 45 * multiplier,
      ep: activity?.ep || 0,
      double_goal: doubleGoal,
      hasNFT: !!nft?.length,
      isPremium: !!user?.is_premium,
      powerbankCount,
    });

  } catch (err) {
    console.error('❌ /api/sync error:', err.message || err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};