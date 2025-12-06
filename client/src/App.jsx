import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import CookieConsent from 'react-cookie-consent';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { API_URL, API_ENDPOINTS, STORAGE_KEYS, COOKIE_NAMES, URL_PARAMS, ROUTES, NUMERIC_CONSTANTS } from './constants';

// Import Components
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header';
import PredictionModal from './components/PredictionModal';
import LoginPromptModal from './components/LoginPromptModal';
import EarningsBanner from './components/EarningsBanner';
import Footer from './components/Footer';
import FeatureRoute from './components/FeatureRoute';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { PushNotifications } from '@capacitor/push-notifications';

// DEBUG: Global Error Handler for Mobile
window.onerror = function (msg, url, lineNo, columnNo, error) {
  alert('Error: ' + msg + '\nLine: ' + lineNo);
  return false;
};

const FallbackLoading = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-red-900 text-white">
    <svg className="animate-spin h-8 w-8 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="mt-4">Loading application...</p>
  </div>
);

// Lazy-loaded components
const HomePage = lazy(() => import('./pages/HomePage'));
const ScoreboardPage = lazy(() => import('./pages/ScoreboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const EditProfilePage = lazy(() => import('./pages/EditProfilePage'));
const StockPage = lazy(() => import('./pages/StockPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const FollowersPage = lazy(() => import('./pages/FollowersPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const PredictionDetailPage = lazy(() => import('./pages/PredictionDetailPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const GoldenFeedPage = lazy(() => import('./pages/GoldenFeedPage'));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'));
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AIWizardPage = lazy(() => import('./pages/AIWizardPage'));
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const WhitepaperPage = lazy(() => import('./pages/WhitepaperPage'));

// --- 1. LOAD STRIPE JS GLOBALLY ---
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve(null);

// --- TEST DATA FOR EARNINGS BANNER ---
const TEST_EARNINGS_DATA = [
  { ticker: 'NVDA', earningsDate: '2025-11-28', time: 'AMC' },
  { ticker: 'TSLA', earningsDate: '2025-12-02', time: 'BMO' },
  { ticker: 'MSFT', earningsDate: '2025-12-05', time: 'AMC' },
  { ticker: 'SBUX', earningsDate: '2025-12-09', time: 'BMO' },
];

const CanonicalTag = () => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const baseUrl = `https://www.stockpredictorai.com${location.pathname === '/' ? '' : location.pathname}`;
  const currentLang = i18n.language || 'en';
  const canonicalUrl = currentLang === 'en' ? baseUrl : `${baseUrl}?lang=${currentLang}`;
  const languages = ['en', 'tr', 'de', 'es', 'zh', 'ru', 'fr', 'nl', 'ar', 'hi'];

  return (
    <Helmet>
      <link rel="canonical" href={canonicalUrl} />
      {languages.map(lang => (
        <link key={lang} rel="alternate" hreflang={lang} href={lang === 'en' ? baseUrl : `${baseUrl}?lang=${lang}`} />
      ))}
      <link rel="alternate" hreflang="x-default" href={baseUrl} />
    </Helmet>
  );
};

function App() {
  const { t, i18n } = useTranslation();

  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [stockToPredict, setStockToPredict] = useState(null);
  const [settings, setSettings] = useState(null);
  const [cookieConsent, setCookieConsent] = useState(false);
  const [earningsCalendar, setEarningsCalendar] = useState([]);
  const [error, setError] = useState(null);

  const handleOpenPredictionModal = useCallback((ticker = null) => {
    if (user) {
      setStockToPredict(ticker);
      setIsPredictionModalOpen(true);
    } else {
      requestLogin();
    }
  }, [user]);

  const handleCloseModal = useCallback(() => {
    setIsPredictionModalOpen(false);
    setStockToPredict(null);
  }, []);

  const requestLogin = () => setIsLoginPromptOpen(true);

  const fetchUser = useCallback(async () => {
    try {
      console.log('Fetching user from:', `${API_URL}${API_ENDPOINTS.CURRENT_USER}`);
      const res = await axios.get(`${API_URL}${API_ENDPOINTS.CURRENT_USER}`, { withCredentials: true, timeout: 5000 });
      console.log('Fetch user response:', res.status, res.data);
      setUser(res.data);
    } catch (err) {
      console.error('Fetch user error:', err.message, err.code, err.response?.status);
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}${API_ENDPOINTS.SETTINGS}`, { withCredentials: true, timeout: 5000 });
      setSettings(res.data);
    } catch (err) {
      console.error("Failed to fetch settings", err.message, err.code, err.response?.status);
      setSettings({}); // Fallback to empty object to allow render
    }
  }, []);

  // Fetch Earnings Calendar
  useEffect(() => {
    console.log("Earnings: Initiating fetch for calendar...");
    axios.get(`${API_URL}${API_ENDPOINTS.EARNINGS_CALENDAR}`)
      .then(res => {
        const validCalendar = (res.data || []).filter(e => e.earningsDate).slice(0, 50);
        if (validCalendar.length === 0 && import.meta.env.DEV) {
          console.warn("Earnings: API returned 0 entries. Using DEV test data.");
          setEarningsCalendar(TEST_EARNINGS_DATA);
          return;
        }
        setEarningsCalendar(validCalendar);
      })
      .catch(err => {
        console.error("Earnings: Failed to fetch earnings calendar.", err.message);
        if (import.meta.env.DEV) {
          setEarningsCalendar(TEST_EARNINGS_DATA);
        }
      });
  }, []);

  // Initial Fetch
  useEffect(() => {
    fetchUser();
    fetchSettings();
  }, [fetchUser, fetchSettings]);

  // Referral Code
  useEffect(() => {
    if (!isAuthLoading && cookieConsent) {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get(URL_PARAMS.REF);
      if (refCode) {
        localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, refCode);
      }
    }
  }, [isAuthLoading, cookieConsent]);

  // Language Param
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    if (langParam && ['en', 'tr', 'de', 'es', 'zh', 'ru', 'fr', 'nl', 'ar', 'hi'].includes(langParam)) {
      if (i18n.language !== langParam) {
        i18n.changeLanguage(langParam);
      }
    }
  }, [i18n]);

  // RTL Support
  useEffect(() => {
    const isRtl = i18n.language === 'ar';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Mobile Deep Link Handler & Google Auth Init
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@codetrix-studio/capacitor-google-auth').then(({ GoogleAuth }) => {
        GoogleAuth.initialize({
          clientId: '645392634302-rfhrct0ds4qmukha4fds46rcsv8kfp86.apps.googleusercontent.com', // Verified Web Client ID
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });
        console.log('GoogleAuth initialized');
        alert('GoogleAuth initialized in App.jsx');
      });

      CapacitorApp.addListener('appUrlOpen', data => {
        const url = new URL(data.url);
        if (url.protocol === 'stockpredictorai:' && url.host === 'auth-success') {
          const token = url.searchParams.get('token');
          if (token) {
            axios.post(`${API_URL}/auth/mobile-exchange`, { token }, { withCredentials: true })
              .then(() => {
                fetchUser();
                Browser.close();
              })
              .catch(err => console.error('Mobile auth failed', err));
          }
        }
      });
    }
  }, [fetchUser]);

  // --- PUSH NOTIFICATIONS SETUP (DISABLED FOR DEBUGGING) ---
  /*
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      PushNotifications.requestPermissions().then(result => {
        if (result.receive === 'granted') {
          PushNotifications.register();
        }
      });

      PushNotifications.addListener('registration', (token) => {
        console.log('Push Registration Token:', token.value);
        axios.post(`${API_URL}/api/notifications/register-token`, { token: token.value }, { withCredentials: true })
          .catch(err => console.error("Failed to register push token", err));
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push Registration Error:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push Received:', notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push Action:', notification);
      });
    }
  }, []);
  */

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <h1 className="text-xl font-bold text-red-500 mb-2">Application Error</h1>
        <p className="text-gray-300 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">Retry</button>
      </div>
    );
  }

  if (isAuthLoading || !settings) {
    return <FallbackLoading />;
  }

  return (
    <Router>
      <Helmet>
        <title>{t('seo.default.title', 'StockPredictorAI - Predict the Market, Track Your Accuracy')}</title>
        <meta name="description" content={t('seo.default.description', 'Join the StockPredictorAI community to make stock predictions, track your accuracy, and follow top-performing analysts. Sign up to build your track record.')} />
      </Helmet>
      <Toaster position="top-center" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      <ScrollToTop />
      <CanonicalTag />
      <Elements stripe={stripePromise}>
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col">
          <EarningsBanner
            calendar={earningsCalendar}
            onMakePredictionClick={(stock) => handleOpenPredictionModal({ symbol: stock.symbol })}
            isActive={settings?.isEarningsBannerActive}
          />
          <Header user={user} onMakePredictionClick={handleOpenPredictionModal} settings={settings} onProfileUpdate={fetchUser} />
          <PredictionModal isOpen={isPredictionModalOpen} onClose={handleCloseModal} initialStock={stockToPredict} />
          <LoginPromptModal isOpen={isLoginPromptOpen} onClose={() => setIsLoginPromptOpen(false)} />
          <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-2 md:pt-4 pb-4 md:pb-6 lg:pb-8">
            <Suspense fallback={<FallbackLoading />}>
              <Routes>
                <Route path={ROUTES.HOME} element={<ExplorePage requestLogin={requestLogin} settings={settings} user={user} isAuthLoading={isAuthLoading} />} />
                <Route path={ROUTES.DASHBOARD} element={<HomePage user={user} settings={settings} onMakePredictionClick={handleOpenPredictionModal} />} />
                <Route path={ROUTES.COMPLETE_PROFILE} element={<CompleteProfilePage />} />
                <Route path={ROUTES.EXPLORE} element={<ExplorePage requestLogin={requestLogin} settings={settings} user={user} isAuthLoading={isAuthLoading} />} />
                <Route path={ROUTES.SCOREBOARD} element={<ScoreboardPage settings={settings} />} />
                <Route path={ROUTES.PROFILE} element={<ProfilePage settings={settings} requestLogin={requestLogin} onProfileUpdate={fetchUser} currentUser={user} />} />
                <Route path={ROUTES.FOLLOWERS} element={<FollowersPage settings={settings} onProfileUpdate={fetchUser} />} />
                <Route path={ROUTES.EDIT_PROFILE} element={<EditProfilePage onProfileUpdate={fetchUser} />} />
                <Route path={ROUTES.STOCK} element={<StockPage onPredictClick={handleOpenPredictionModal} settings={settings} />} />
                <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                <Route path={ROUTES.ABOUT} element={<AboutPage />} />
                <Route path={ROUTES.TERMS} element={<TermsPage />} />
                <Route path={ROUTES.PRIVACY} element={<PrivacyPage />} />
                <Route path={ROUTES.ADMIN} element={<AdminPage />} />
                <Route path={ROUTES.PREDICTION_DETAIL} element={<PredictionDetailPage user={user} requestLogin={requestLogin} settings={settings} />} />
                <Route path={ROUTES.GOLDEN_FEED} element={<GoldenFeedPage settings={settings} />} />
                <Route path={ROUTES.CONTACT} element={<ContactPage />} />
                <Route path={ROUTES.WATCHLIST} element={<WatchlistPage settings={settings} />} />
                <Route path={ROUTES.NOTIFICATIONS} element={<NotificationSettingsPage />} />
                <Route path={ROUTES.PAYMENT_SUCCESS} element={<PaymentSuccessPage />} />
                <Route path={ROUTES.WHITEPAPER} element={<WhitepaperPage />} />
                <Route
                  path={ROUTES.AI_WIZARD}
                  element={
                    <FeatureRoute settings={settings} featureFlag="isAIWizardEnabled">
                      <AIWizardPage user={user} />
                    </FeatureRoute>
                  }
                />
              </Routes>
            </Suspense>
          </main>
          <Footer settings={settings} />
        </div>
      </Elements>
      <CookieConsent
        location="bottom"
        buttonText={t('common.accept', 'Accept')}
        declineButtonText={t('common.decline', 'Decline')}
        cookieName={COOKIE_NAMES.CONSENT}
        style={{ background: "#2B374A" }}
        buttonStyle={{ color: "#4e503b", fontSize: "13px", background: "#EAB308", borderRadius: "5px" }}
        declineButtonStyle={{ color: "#FFF", fontSize: "13px", background: "#4B5563", borderRadius: "5px" }}
        expires={NUMERIC_CONSTANTS.COOKIE_EXPIRY_DAYS}
        onAccept={() => setCookieConsent(true)}
        onDecline={() => setCookieConsent(false)}
      >
        {t('common.cookieConsent', 'This website uses cookies to enhance the user experience. By accepting, you agree to our use of cookies for analytics and referrals.')}
      </CookieConsent>
    </Router>
  );
}

export default App;