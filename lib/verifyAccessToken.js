// lib/verifyAccessToken.js — v1.0.0 (JWT + jti сессия)
const { verifyToken } = require('./jwt');
const supabase = require('./supabase');

/**
 * Проверяет access_token в заголовке Authorization и jti в Supabase
 * @param {Request} req
 * @returns {Promise<Object>} decoded user { telegram_id, jti, ... }
 */
module.exports = async function verifyAccessToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token); // throws if invalid

  const { data, error } = await supabase
    .from("token_sessions")
    .select("id")
    .eq("jti", decoded.jti)
    .eq("telegram_id", decoded.telegram_id)
    .eq("revoked", false)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Session invalid or expired");
  }

  return decoded;
};
