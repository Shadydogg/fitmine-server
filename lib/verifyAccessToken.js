// /lib/verifyAccessToken.js — v1.1.0
const { verifyToken } = require('./jwt');
const supabase = require('./supabase');

/**
 * Проверяет access_token в заголовке Authorization и jti в Supabase
 * @param {Request} req
 * @returns {Promise<Object>} decoded user { telegram_id, jti, ... }
 */
module.exports = async function verifyAccessToken(req) {
  const authHeader = req.headers.authorization || '';
  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    throw new Error("Missing or invalid Authorization header");
  }

  let decoded;
  try {
    decoded = verifyToken(token); // throws if invalid
  } catch (err) {
    console.warn("❌ JWT валидация не пройдена:", err.message);
    throw new Error("Invalid or expired token");
  }

  const { data, error } = await supabase
    .from("token_sessions")
    .select("id")
    .eq("jti", decoded.jti)
    .eq("telegram_id", decoded.telegram_id)
    .eq("revoked", false)
    .maybeSingle();

  if (error || !data) {
    console.warn(`⚠️ AccessToken: Не найдена активная сессия для jti=${decoded.jti}`);
    throw new Error("Session invalid or expired");
  }

  return decoded;
};