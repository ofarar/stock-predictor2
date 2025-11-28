import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CookieConsent from "react-cookie-consent";
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { API_URL, API_ENDPOINTS, STORAGE_KEYS, COOKIE_NAMES, URL_PARAMS, ROUTES, NUMERIC_CONSTANTS } from './constants';

// Import Components
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header';
import PredictionModal from './components/PredictionModal';
import LoginPromptModal from './components/LoginPromptModal';
import Footer from './components/Footer';
import FeatureRoute from './components/FeatureRoute';
import EarningsBanner from './components/EarningsBanner';

import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// --- CODE SPLITTING: Lazy Load Pages ---

// Define a minimal loading component for Suspense fallback
const FallbackLoading = () => (
  <div className="text-center py-20 text-gray-400">
    <svg className="animate-spin h-8 w-8 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="mt-4">Loading application...</p>
  </div>
);

// Lazy-loaded components (All pages are now dynamically imported)
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

// --- 1. LOAD STRIPE JS GLOBALLY (OUTSIDE THE COMPONENT) ---
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// NOTE: Add a check to prevent crash if key is missing during build/deploy
const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve(null);
// -------------------------------------------------------------

// --- TEST DATA FOR EARNINGS BANNER ---
const TEST_EARNINGS_DATA = [
  // Today is Thursday, Nov 27, 2025. Set dates relative to today.
  { ticker: 'NVDA', earningsDate: '2025-11-28', time: 'AMC' }, // Tomorrow
  { ticker: 'TSLA', earningsDate: '2025-12-02', time: 'BMO' }, // Next Monday
  { ticker: 'MSFT', earningsDate: '2025-12-05', time: 'AMC' }, // Next Week Friday
  { ticker: 'SBUX', earningsDate: '2025-12-09', time: 'BMO' }, // Two Weeks Out
];
// -------------------------------------


function App() {
  const { t, i18n } = useTranslation();

  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [stockToPredict, setStockToPredict] = useState(null);
  const [settings, setSettings] = useState(null);
  const [cookieConsent, setCookieConsent] = useState(false);

  // --- NEW STATE: Global Earnings Calendar ---
  const [earningsCalendar, setEarningsCalendar] = useState([]);
  // ------------------------------------------


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

  // Fetch the current user once when the app loads
  const fetchUser = useCallback(() => {
    setIsAuthLoading(true);

    axios.get(`${API_URL}${API_ENDPOINTS.CURRENT_USER}`, { withCredentials: true })
      .then(res => {
        setUser(res.data || null);
        if (res.data?.language && res.data.language !== i18n.language) {
          i18n.changeLanguage(res.data.language);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setIsAuthLoading(false));
  }, [i18n]);

  const fetchSettings = useCallback(() => {
    axios.get(`${API_URL}${API_ENDPOINTS.SETTINGS}`, { withCredentials: true })
      .then(res => setSettings(res.data))
      .catch((error) => console.error("Failed to fetch settings:", error));
  }, []);

  // --- EFFECT: Fetch Earnings Calendar (Runs Once) ---
  useEffect(() => {
    console.log("Earnings: Initiating fetch for calendar...");
    axios.get(`${API_URL}${API_ENDPOINTS.EARNINGS_CALENDAR}`)
      .then(res => {
        const validCalendar = (res.data || []).filter(e => e.earningsDate).slice(0, 50);

        // --- LOGIC 1: Check for Empty Results ---
        if (validCalendar.length === 0 && import.meta.env.DEV) {
          console.warn("Earnings: API returned 0 entries. Using DEV test data.");
          setEarningsCalendar(TEST_EARNINGS_DATA);
          return;
        }
        // ---------------------------------------

        console.log(`Earnings: Successfully received ${validCalendar.length} valid entries.`);
        if (validCalendar.length > 0) {
          console.log("Earnings: First calendar entry:", validCalendar[0]);
        }

        setEarningsCalendar(validCalendar);
      })
      .catch(err => {
        console.error("Earnings: Failed to fetch earnings calendar.", err.message);
        // --- LOGIC 2: Fallback on API failure in DEV mode ---
        if (import.meta.env.DEV) {
          console.warn("Earnings: API failed. Using DEV test data for display.");
          setEarningsCalendar(TEST_EARNINGS_DATA);
        }
        // ----------------------------------------------------
      });
  }, []);
  // --- END EFFECT ---


  useEffect(() => {
    fetchUser();
    fetchSettings();
  }, [fetchUser, fetchSettings]);

  useEffect(() => {
    if (!isAuthLoading && cookieConsent) {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get(URL_PARAMS.REF);
      if (refCode) {
        localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, refCode);
      }
    }
  }, [isAuthLoading, cookieConsent]);

  // --- RTL Support ---
  useEffect(() => {
    const isRtl = i18n.language === 'ar';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  if (isAuthLoading || !settings) {
    return <FallbackLoading />;
  }

  return (
    <Router>
      <Helmet>
        <title>{t('seo.default.title', 'StockPredictorAI - Predict the Market, Track Your Accuracy')}</title>
        <meta name="description" content={t('seo.default.description', 'Join the StockPredictorAI community to make stock predictions, track your accuracy, and follow top-performing analysts. Sign up to build your track record.')} />
        {/* --- HREFLANG tags should be added here dynamically in a full setup --- */}
      </Helmet>
      <Toaster position="top-center" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      <ScrollToTop />
      {/* --- 2. WRAP THE MAIN LAYOUT IN THE <ELEMENTS> PROVIDER --- */}
      <Elements stripe={stripePromise}>
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col">

          <EarningsBanner
            calendar={earningsCalendar}
            // MODIFIED: Ensure the object passed is structured like a quote object, 
            // but only contains the symbol, forcing the widget to fetch the price.
            onMakePredictionClick={(stock) => handleOpenPredictionModal({ symbol: stock.symbol })}
            isActive={settings?.isEarningsBannerActive}
          />

          <Header user={user} onMakePredictionClick={handleOpenPredictionModal} settings={settings} onProfileUpdate={fetchUser} />
          <PredictionModal isOpen={isPredictionModalOpen} onClose={handleCloseModal} initialStock={stockToPredict} />
          <LoginPromptModal isOpen={isLoginPromptOpen} onClose={() => setIsLoginPromptOpen(false)} />
          <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-2 md:pt-4 pb-4 md:pb-6 lg:pb-8">

            {/* --- WRAP ROUTES IN SUSPENSE --- */}
            <Suspense fallback={<FallbackLoading />}>
              <Routes>
                {/* Note: Components are now rendered using the lazy-loaded versions */}
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
            {/* --- END SUSPENSE WRAPPER --- */}
          </main>
          <Footer settings={settings} />
        </div>
      </Elements>
      {/* --- Cookie Consent --- */}
      <CookieConsent
        location="bottom"
        buttonText={t('common.accept', 'Accept')}
        declineButtonText={t('common.decline', 'Decline')}
        cookieName={COOKIE_NAMES.CONSENT}
        style={{ background: "#2B374A" }}
        buttonStyle={{ color: "#4e503b", fontSize: "13px", background: "#EAB308", borderRadius: "5px" }}
        declineButtonStyle={{ color: "#FFF", fontSize: "13px", background: "#4B5563", borderRadius: "5px" }}
        expires={NUMERIC_CONSTANTS.COOKIE_EXPIRY_DAYS}
        onAccept={() => {
          setCookieConsent(true);
        }}
        onDecline={() => {
          setCookieConsent(false);
        }}
      >
        {t('common.cookieConsent', 'This website uses cookies to enhance the user experience. By accepting, you agree to our use of cookies for analytics and referrals.')}
      </CookieConsent>
    </Router>
  );
}

export default App;