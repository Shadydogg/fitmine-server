// useTokenRefresher.ts — v1.0.0
import { useEffect } from 'react';
import api from '../api/apiClient';

export default function useTokenRefresher() {
  useEffect(() => {
    const interval = setInterval(() => {
      const refresh_token = localStorage.getItem('refresh_token');
      if (!refresh_token) return;

      api.post('/refresh', null, {
        headers: {
          Authorization: `Bearer ${refresh_token}`,
        },
      }).then(res => {
        const { access_token, refresh_token: new_refresh } = res.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', new_refresh);
        console.log('🔁 Токены обновлены');
      }).catch(err => {
        console.warn('⚠️ Автообновление токена не удалось');
      });

    }, 10 * 60 * 1000); // каждые 10 минут

    return () => clearInterval(interval);
  }, []);
}
