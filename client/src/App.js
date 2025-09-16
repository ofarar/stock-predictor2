import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';

// Import Components
import Header from './components/Header';
import PredictionModal from './components/PredictionModal';
import LoginPromptModal from './components/LoginPromptModal';
import Footer from './components/Footer';

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

function App() {
  const [user, setUser] = useState(null);
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [stockToPredict, setStockToPredict] = useState(null);

  // Fetch the current user once when the app loads
  useEffect(() => {
    axios.get('http://localhost:5001/auth/current_user', { withCredentials: true })
        .then(res => setUser(res.data || null));
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
        
        <main className="flex-grow container mx-auto px-4 sm:px-6 py-4">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/scoreboard" element={<ScoreboardPage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/profile/:userId/followers" element={<FollowersPage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/stock/:ticker" element={<StockPage onPredictClick={handleOpenPredictionModal} />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
          </Routes>
        </main>
        
        <Footer />
      </div>
    </Router>
  );
}

export default App;