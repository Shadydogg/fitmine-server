// v1.2.11 — src/pages/Landing.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import logo from '../assets/logo.png';

type Props = {
  onStart: () => void;
  loading: boolean;
};

const Landing: React.FC<Props> = ({ onStart, loading }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md rounded-3xl shadow-lg p-8 text-center mx-2">
      <img
        src={logo}
        alt="FitMine Logo"
        className="w-60 md:w-72 mb-6 drop-shadow-xl rounded-xl"
      />
      <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-yellow-400 to-blue-500 mb-3">
        FitMine
      </h1>
      <p className="text-sm text-gray-600 max-w-md mb-4">
        {t('landing.description')}
      </p>

      <button
        onClick={onStart}
        disabled={loading}
        className={`px-8 py-3 rounded-full font-bold text-white text-lg shadow-lg transition-all duration-300 ease-in-out
          ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-pink-500 via-yellow-400 to-blue-500 hover:scale-105 hover:shadow-xl animate-pulse'}
        `}
      >
        {loading ? t('loading') : t('landing.start')}
      </button>

      <div className="mt-6 text-xs text-gray-400">@FitMineBot</div>
    </div>
  );
};

export default Landing;
