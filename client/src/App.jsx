import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react'; // <-- ADDED lazy, Suspense
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CookieConsent from "react-cookie-consent";
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast'; // <-- FIX: Import 'toast'
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

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
    axios.get(`${import.meta.env.VITE_API_URL}/auth/current_user`, { withCredentials: true })
      .then(res => setUser(res.data || null))
      .catch(() => setUser(null))
      .finally(() => setIsAuthLoading(false));
  };

  useEffect(() => {
    fetchUser();
    axios.get(`${import.meta.env.VITE_API_URL}/api/settings`, { withCredentials: true })
      .then(res => setSettings(res.data));

    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode && cookieConsent) {
      localStorage.setItem('referralCode', refCode);
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
              <Route path="/" element={<ExplorePage requestLogin={requestLogin} settings={settings} user={user} isAuthLoading={isAuthLoading} />} />
              <Route path="/dashboard" element={<HomePage user={user} settings={settings} />} />
              <Route path="/complete-profile" element={<CompleteProfilePage />} />
              <Route path="/explore" element={<ExplorePage requestLogin={requestLogin} settings={settings} user={user} isAuthLoading={isAuthLoading} />} />
              <Route path="/scoreboard" element={<ScoreboardPage settings={settings} />} />
              <Route path="/profile/:userId" element={<ProfilePage settings={settings} requestLogin={requestLogin} />} />
              <Route path="/profile/:userId/followers" element={<FollowersPage settings={settings} />} />
              <Route path="/profile/edit" element={<EditProfilePage onProfileUpdate={fetchUser} />} />
              <Route path="/stock/:ticker" element={<StockPage onPredictClick={handleOpenPredictionModal} settings={settings} />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/prediction/:predictionId" element={<PredictionDetailPage user={user} requestLogin={requestLogin} settings={settings} />} />
              <Route path="/golden-feed" element={<GoldenFeedPage settings={settings} />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/watchlist" element={<WatchlistPage settings={settings} />} />
              <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
              <Route path="/payment-success" element={<PaymentSuccessPage />} />
              <Route
                path="/ai-wizard"
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
        cookieName="stockpredictor-cookie-consent"
        style={{ background: "#2B374A" }}
        buttonStyle={{ color: "#4e503b", fontSize: "13px", background: "#EAB308", borderRadius: "5px" }}
        declineButtonStyle={{ color: "#FFF", fontSize: "13px", background: "#4B5563", borderRadius: "5px" }}
        expires={150}
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