import './i18n'; // must be before App or anything using useTranslation
import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css'; // Imports your main stylesheet
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);