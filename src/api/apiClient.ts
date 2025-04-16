// apiClient.ts — v3.0.0
import axios from 'axios';

// 🌐 Создаём инстанс с базовым URL
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 🧠 Добавляем access_token в заголовки перед каждым запросом
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🔁 Автоматическое обновление токена при 401
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refresh_token = localStorage.getItem('refresh_token');
      if (!refresh_token) {
        console.warn('⛔ Нет refresh_token в localStorage');
        return Promise.reject(error);
      }

      try {
        const res = await axios.post('/api/refresh', null, {
          headers: {
            Authorization: `Bearer ${refresh_token}`,
          },
        });

        const { access_token, refresh_token: new_refresh } = res.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', new_refresh);

        // Повторяем оригинальный запрос с новым токеном
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);

      } catch (refreshError) {
        console.error('❌ Ошибка при обновлении токена:', refreshError);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
