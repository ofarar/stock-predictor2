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

  // Fetch the current user once when the app loads
  const fetchUser = () => {
    axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true })
      .then(res => setUser(res.data || null));
  };

  useEffect(() => {
    fetchUser(); // Fetch user on initial load
  }, []);

  // This function is passed to components to open the prediction modal
  const handleOpenPredictionModal = (stock = null) => {
    if (user) { // If user is logged in, open the real prediction modal
      setStockToPredict(stock);
      setIsPredictionModalOpen(true);
    } else { // If user is a guest, open the login prompt modal
      setIsLoginPromptOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsPredictionModalOpen(false);
    setStockToPredict(null);
  };

  return (
    <Router>
      <Toaster // 2. Add the component here
        position="top-center"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
      <ScrollToTop />
      <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col">
        <Header user={user} onMakePredictionClick={handleOpenPredictionModal} />

        <PredictionModal
          isOpen={isPredictionModalOpen}
          onClose={handleCloseModal}
          initialStock={stockToPredict}
        />
        <LoginPromptModal
          isOpen={isLoginPromptOpen}
          onClose={() => setIsLoginPromptOpen(false)}
        />

        <main className="flex-grow container mx-auto px-4 sm:px-6 pt-2 sm:pt-2 md:pt-0 pb-2 sm:pb-4">
          <PageSpecificContent />
          <Routes>
            <Route path="/" element={<HomePage user={user} />} />
            <Route path="/scoreboard" element={<ScoreboardPage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/profile/:userId/followers" element={<FollowersPage />} />
            <Route path="/profile/edit" element={<EditProfilePage onProfileUpdate={fetchUser} />} />
            <Route path="/stock/:ticker" element={<StockPage onPredictClick={handleOpenPredictionModal} />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/prediction/:predictionId" element={<PredictionDetailPage />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;