const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'fitmine_super_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';        // ⏱ access_token
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '30d'; // 🔁 refresh_token

/**
 * Генерация access и refresh токенов
 * @param {Object} payload - данные пользователя (например, telegram_id)
 * @returns {{ access_token: string, refresh_token: string, jti: string }}
 */
function generateTokens(payload) {
  const jti = randomUUID(); // 🧾 уникальный идентификатор сессии

  const access_token = jwt.sign({ ...payload, jti }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const refresh_token = jwt.sign({ ...payload, jti }, JWT_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });

  return { access_token, refresh_token, jti };
}

/**
 * Проверка и декодирование токена
 * @param {string} token - JWT
 * @returns {Object} payload
 * @throws {Error} если токен невалиден
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  generateTokens,
  verifyToken,
};