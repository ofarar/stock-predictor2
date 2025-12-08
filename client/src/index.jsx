import './i18n'; // must be before App or anything using useTranslation
import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css'; // Imports your main stylesheet
import App from './App';
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  debug: false,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: [
    "localhost",
    "stockpredictorai.com",
    "www.stockpredictorai.com",
    /^https:\/\/.*\.stockpredictorai\.com\/api/,
    "stockpredictorai-api.fly.dev"
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* 2. WRAP YOUR APP */}
    <Sentry.ErrorBoundary fallback={<div className="text-white p-4">An error has occurred. Sentry should have captured this.</div>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);