// v1.2.2 — src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import './i18n/setup';
import './index.css'; // ✅ Подключаем Tailwind + Inter font

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <BrowserRouter basename="/tgapp">
    <App />
  </BrowserRouter>
);
