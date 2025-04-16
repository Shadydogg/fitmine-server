// v1.4.0 — Profile через Bearer access_token
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function Profile() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || token.length < 20) {
      console.warn('❌ accessToken не найден');
      setLoading(false);
      return;
    }

    fetch('https://api.fitmine.vip/api/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.ok) {
          setUser(res.user);
        } else {
          console.warn('⚠️ Ошибка загрузки профиля:', res.error);
        }
      })
      .catch((err) => {
        console.error('❌ Ошибка профиля:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600 text-center">
        {t('profile.loading', 'Загрузка профиля...')}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 text-center">
        {t('profile.notFound', 'Профиль не найден')}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gradient-to-br from-white/10 to-black/80 backdrop-blur-lg relative text-white">
      {/* 🔙 Back */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 text-sm text-gray-400 hover:text-white"
      >
        ← {t('profile.back')}
      </button>

      {/* 🧩 Заголовок */}
      <h1 className="text-3xl font-bold mt-12 mb-6 tracking-wide drop-shadow">
        {t('profile.title')} • FitMine
      </h1>

      {/* 🧊 Карточка */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white/10 border border-white/20 rounded-2xl shadow-xl p-6 max-w-sm w-full text-center"
      >
        <img
          src={user.photo_url || '/default-avatar.png'}
          alt="avatar"
          className="w-24 h-24 rounded-full mx-auto mb-4 shadow-md"
        />
        <h2 className="text-xl font-semibold">
          {user.first_name} {user.last_name}
        </h2>
        <p className="text-sm text-gray-300">@{user.username}</p>

        {user.is_premium && (
          <div className="mt-2 inline-block px-3 py-1 text-xs bg-purple-600 text-white rounded-full shadow">
            {t('profile.premium')}
          </div>
        )}

        <div className="mt-4 text-xs text-gray-400 space-y-1">
          <div>🆔 {t('profile.id')}: {user.telegram_id}</div>
          <div>🌐 Язык: {user.language_code}</div>
          <div>💬 ЛС: {user.allows_write_to_pm ? '✅ Да' : '❌ Нет'}</div>
        </div>

        {/* 🚀 Кнопка перехода в Dashboard */}
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-6 px-4 py-2 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-full shadow hover:scale-105 transition-transform"
        >
          {t('profile.goDashboard', 'Перейти в активность')}
        </button>
      </motion.div>
    </div>
  );
}
