import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react'; // <-- ADDED lazy, Suspense
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CookieConsent from "react-cookie-consent";
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast'; // <-- FIX: Import 'toast'
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { API_URL, API_ENDPOINTS, STORAGE_KEYS, COOKIE_NAMES, URL_PARAMS, ROUTES, NUMERIC_CONSTANTS } from './constants';

// Import Components (These remain static for immediate load)
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header';
import PredictionModal from './components/PredictionModal';
import LoginPromptModal from './components/LoginPromptModal';
import Footer from './components/Footer';
import FeatureRoute from './components/FeatureRoute';

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


function App() {
  const { t } = useTranslation();

  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [stockToPredict, setStockToPredict] = useState(null);
  const [settings, setSettings] = useState(null);
  const [cookieConsent, setCookieConsent] = useState(false);

  // Fetch the current user once when the app loads
  const fetchUser = () => {
    setIsAuthLoading(true);
    axios.get(`${API_URL}${API_ENDPOINTS.CURRENT_USER}`, { withCredentials: true })
      .then(res => setUser(res.data || null))
      .catch(() => setUser(null))
      .finally(() => setIsAuthLoading(false));
  };

  useEffect(() => {
    fetchUser();
    axios.get(`${API_URL}${API_ENDPOINTS.SETTINGS}`, { withCredentials: true })
      .then(res => setSettings(res.data));

    const params = new URLSearchParams(window.location.search);
    const refCode = params.get(URL_PARAMS.REF);
    if (refCode && cookieConsent) {
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, refCode);
    }
  }, [cookieConsent]);

  const requestLogin = () => setIsLoginPromptOpen(true);

  const handleOpenPredictionModal = (stock = null) => {
    if (user) {
      setStockToPredict(stock);
      setIsPredictionModalOpen(true);
    } else {
      requestLogin();
    }
  };

  const handleCloseModal = () => {
    setIsPredictionModalOpen(false);
    setStockToPredict(null);
  };

  return (
    <Router>
      <Helmet>
        <title>{t('seo.default.title', 'StockPredictorAI - Predict the Market, Track Your Accuracy')}</title>
        <meta name="description" content={t('seo.default.description', 'Join the StockPredictorAI community to make stock predictions, track your accuracy, and follow top-performing analysts. Sign up to build your track record.')} />
      </Helmet>
      <Toaster position="top-center" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      <ScrollToTop />
      <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col">
        <Header user={user} onMakePredictionClick={handleOpenPredictionModal} settings={settings} />
        <PredictionModal isOpen={isPredictionModalOpen} onClose={handleCloseModal} initialStock={stockToPredict} />
        <LoginPromptModal isOpen={isLoginPromptOpen} onClose={() => setIsLoginPromptOpen(false)} />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-2 md:pt-4 pb-4 md:pb-6 lg:pb-8">

          {/* --- WRAP ROUTES IN SUSPENSE --- */}
          <Suspense fallback={<FallbackLoading />}>
            <Routes>
              {/* Note: Components are now rendered using the lazy-loaded versions */}
              <Route path={ROUTES.HOME} element={<ExplorePage requestLogin={requestLogin} settings={settings} user={user} isAuthLoading={isAuthLoading} />} />
              <Route path={ROUTES.DASHBOARD} element={<HomePage user={user} settings={settings} />} />
              <Route path={ROUTES.COMPLETE_PROFILE} element={<CompleteProfilePage />} />
              <Route path={ROUTES.EXPLORE} element={<ExplorePage requestLogin={requestLogin} settings={settings} user={user} isAuthLoading={isAuthLoading} />} />
              <Route path={ROUTES.SCOREBOARD} element={<ScoreboardPage settings={settings} />} />
              <Route path={ROUTES.PROFILE} element={<ProfilePage settings={settings} requestLogin={requestLogin} />} />
              <Route path={ROUTES.FOLLOWERS} element={<FollowersPage settings={settings} />} />
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
        <Footer />
      </div>
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