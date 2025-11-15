import './i18n'; // must be before App or anything using useTranslation
import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css'; // Imports your main stylesheet
import App from './App';
import { HelmetProvider } from 'react-helmet-async'; // <-- 1. IMPORT

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* 2. WRAP YOUR APP */}
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);