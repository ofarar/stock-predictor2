import './i18n'; // must be before App or anything using useTranslation
import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css'; // Imports your main stylesheet
import App from './App';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  debug: true, // Enable debug mode
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Tracing
  tracesSampleRate: 1.0,
  tracePropagationTargets: [
    "localhost",                  // local dev
    "stockpredictorai.com",       // main domain
    "www.stockpredictorai.com",   // www subdomain
    /^https:\/\/.*\.stockpredictorai\.com\/api/ // optional: any API subpath
  ],
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* 2. WRAP YOUR APP */}
    <HelmetProvider>
      <Sentry.ErrorBoundary fallback={<div className="text-white p-4">An error has occurred. Sentry should have captured this.</div>}>
        <App />
      </Sentry.ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>
);