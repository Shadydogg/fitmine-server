// FitMine v1.1.3 - client/src/i18n/setup.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import ru from './ru.json';
import zh from './zh.json';
import es from './es.json';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  zh: { translation: zh },
  es: { translation: es }
};

const fallbackLng: ['en'] = ['en'];

// Автоопределение языка из браузера или Telegram WebApp
const lang = (navigator.language.split('-')[0] as keyof typeof resources);

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: resources[lang] ? lang : fallbackLng[0],
    fallbackLng,
    supportedLngs: ['en', 'ru', 'zh', 'es'],
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
