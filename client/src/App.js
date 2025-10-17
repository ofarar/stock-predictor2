import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from 'react-hot-toast';

// Import Components
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header';
import PredictionModal from './components/PredictionModal';
import LoginPromptModal from './components/LoginPromptModal';
import Footer from './components/Footer';
import Aim from './components/Aim';

// Import Pages
import HomePage from './pages/HomePage';
import ScoreboardPage from './pages/ScoreboardPage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import StockPage from './pages/StockPage';
import LoginPage from './pages/LoginPage';
import FollowersPage from './pages/FollowersPage';
import AboutPage from './pages/AboutPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import AdminPage from './pages/AdminPage';
import PredictionDetailPage from './pages/PredictionDetailPage';
import ExplorePage from './pages/ExplorePage';
import GoldenFeedPage from './pages/GoldenFeedPage';
import WatchlistPage from './pages/WatchlistPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import ContactPage from './pages/ContactPage';
import AIWizardPage from './pages/AIWizardPage';
import FeatureRoute from './components/FeatureRoute';
import CompleteProfilePage from './pages/CompleteProfilePage';


// A small helper component to handle the conditional rendering
const PageSpecificContent = () => {
  const location = useLocation();
  // We get the user prop if needed for other conditional components
  // For now, just checking the path
  return (
    <>
      {location.pathname === '/' && <Aim />}
    </>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [stockToPredict, setStockToPredict] = useState(null);
  const [settings, setSettings] = useState(null);

  // Fetch the current user once when the app loads
  const fetchUser = () => {
    axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true })
      .then(res => setUser(res.data || null));
  };

  useEffect(() => {
    fetchUser(); // Fetch user on initial load
    axios.get(`${process.env.REACT_APP_API_URL}/api/settings`, { withCredentials: true })
      .then(res => setSettings(res.data));
  }, []);

  // This function is now passed to more components
  const requestLogin = () => setIsLoginPromptOpen(true);

  // This function is passed to components to open the prediction modal
  const handleOpenPredictionModal = (stock = null) => {
    if (user) { // If user is logged in, open the real prediction modal
      setStockToPredict(stock);
      setIsPredictionModalOpen(true);
    } else { // If user is a guest, open the login prompt modal
      requestLogin();
    }
  };

  const handleCloseModal = () => {
    setIsPredictionModalOpen(false);
    setStockToPredict(null);
  };

  return (
    <Router>
      <Toaster position="top-center" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      <ScrollToTop />
      <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col">
        <Header user={user} onMakePredictionClick={handleOpenPredictionModal} settings={settings} />
        <PredictionModal isOpen={isPredictionModalOpen} onClose={handleCloseModal} initialStock={stockToPredict} />
        <LoginPromptModal isOpen={isLoginPromptOpen} onClose={() => setIsLoginPromptOpen(false)} />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-2 md:pt-4 pb-4 md:pb-6 lg:pb-8">
          <PageSpecificContent />
          <Routes>
            {/* --- Pass 'settings' prop down to all relevant pages --- */}
            <Route path="/" element={<HomePage user={user} settings={settings} />} />
            <Route path="/complete-profile" element={<CompleteProfilePage />} />
            <Route path="/explore" element={<ExplorePage requestLogin={requestLogin} settings={settings} />} />
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
            <Route path="/prediction/:predictionId" element={<PredictionDetailPage requestLogin={requestLogin} settings={settings} />} />
            <Route path="/golden-feed" element={<GoldenFeedPage settings={settings} />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/watchlist" element={<WatchlistPage settings={settings} />} />
            <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
            <Route
              path="/ai-wizard"
              element={
                <FeatureRoute settings={settings} featureFlag="isAIWizardEnabled">
                  <AIWizardPage user={user} />
                </FeatureRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;