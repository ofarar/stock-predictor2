// src/pages/PredictionDetailPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import DescriptionModal from '../components/DescriptionModal';
import PredictionJourney from '../components/PredictionJourney';
import VerifiedTick from '../components/VerifiedTick';
import { useTranslation } from 'react-i18next';
import EditPredictionModal from '../components/EditPredictionModal';
import PredictionHistoryModal from '../components/PredictionHistoryModal';
import { formatPercentage, formatCurrency, formatTimeLeft, formatNumericDate } from '../utils/formatters';
import ShareModal from '../components/ShareModal'; // Import ShareModal
import { Helmet } from 'react-helmet-async'; // <-- 1. IMPORT
import { isMarketOpen } from '../utils/timeHelpers'; // <-- NEW IMPORT

// --- YOUR "GRAPH" SHARE ICON ---
const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
    </svg>
);
// --- END ICON ---

const calculateLiveScore = (predictedPrice, actualPrice) => {
    if (!actualPrice || actualPrice <= 0) return '...';
    const MAX_SCORE = 100;
    const MAX_ERROR_PERCENTAGE = 0.20;
    const error = Math.abs(predictedPrice - actualPrice);
    const errorPercentage = error / actualPrice;
    if (errorPercentage > MAX_ERROR_PERCENTAGE) return 0;
    const rating = MAX_SCORE * (1 - (errorPercentage / MAX_ERROR_PERCENTAGE));
    return parseFloat(rating.toFixed(1));
};

// --- DELETED: Local isMarketOpen function ---

// --- Accept 'user' (currentUser) as a prop ---
const PredictionDetailPage = ({ user: currentUser, requestLogin, settings }) => {
    const { t, i18n } = useTranslation();
    const { predictionId } = useParams();
    const [prediction, setPrediction] = useState(null);
    const [currentQuote, setCurrentQuote] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isDescModalOpen, setIsDescModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareContent, setShareContent] = useState({ text: '', url: '' });

    // --- CONSOLIDATED DATA FETCHING ---
    const fetchData = useCallback(() => {
        setLoading(true);
        // We only need to fetch the prediction. The user prop is passed from App.js.
        axios.get(`${import.meta.env.VITE_API_URL}/api/prediction/${predictionId}`)
            .then(predictionRes => {
                const pred = predictionRes.data;
                setPrediction(pred);
                if (pred.status === 'Active') {
                    // If active, fetch the live quote
                    return axios.get(`${import.meta.env.VITE_API_URL}/api/quote/${pred.stockTicker}`);
                }
            })
            .then(quoteRes => {
                if (quoteRes) {
                    setCurrentQuote(quoteRes.data);
                }
            })
            .catch(() => toast.error(t("Could not load prediction details.")))
            .finally(() => setLoading(false));
    }, [predictionId, t]);

    // This useEffect runs once when the component loads
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- PRESERVED: Your view count logic ---
    useEffect(() => {
        const logView = () => {
            try {
                const viewedPredictions = JSON.parse(localStorage.getItem('viewed_predictions') || '{}');
                const now = Date.now();
                const oneHour = 60 * 60 * 1000;

                if (!viewedPredictions[predictionId] || (now - viewedPredictions[predictionId] > oneHour)) {
                    axios.post(`${import.meta.env.VITE_API_URL}/api/prediction/${predictionId}/view`);
                    viewedPredictions[predictionId] = now;
                    localStorage.setItem('viewed_predictions', JSON.stringify(viewedPredictions));
                }
            } catch (error) {
                console.error("Failed to log prediction view:", error);
            }
        };
        if (predictionId) {
            logView();
        }
    }, [predictionId]);
    // --- END PRESERVED ---

    // This useEffect hook updates the time left (no data fetching)
    useEffect(() => {
        if (prediction?.status === 'Active') {
            const updateTimer = () => {
                const total = Date.parse(prediction.deadline) - Date.now();
                if (total < 0) {
                    setTimeLeft(t("Awaiting Assessment"));
                } else {
                    setTimeLeft(formatTimeLeft(total, t));
                }
            };
            updateTimer(); // Run once immediately
            const timer = setInterval(updateTimer, 1000); // Update every second
            return () => clearInterval(timer);
        }
    }, [prediction, t]);

    // This useEffect hook *only* updates the live price
    // FIX: Pass prediction.stockTicker to isMarketOpen
    useEffect(() => {
        if (prediction?.status === 'Active' && isMarketOpen(prediction.stockTicker)) {
            const quoteTimer = setInterval(() => {
                axios.get(`${import.meta.env.VITE_API_URL}/api/quote/${prediction.stockTicker}`)
                    .then(quoteRes => {
                        if (quoteRes) {
                            setCurrentQuote(quoteRes.data);
                        }
                    })
                    .catch(() => { /* fail silently */ });
            }, 60000); // Update price every minute
            return () => clearInterval(quoteTimer);
        }
    }, [prediction]); 

    const handleVote = (voteType) => {
        if (!currentUser) return requestLogin();
        if (!prediction || prediction.status !== 'Active') return;

        // Optimistic update
        const originalPrediction = { ...prediction };
        const newPrediction = { ...prediction, likes: [...prediction.likes], dislikes: [...prediction.dislikes] };
        const userId = currentUser._id;
        const userLikesIndex = newPrediction.likes.indexOf(userId);
        const userDislikesIndex = newPrediction.dislikes.indexOf(userId);
        if (voteType === 'like') {
            if (userLikesIndex !== -1) newPrediction.likes.splice(userLikesIndex, 1);
            else { newPrediction.likes.push(userId); if (userDislikesIndex !== -1) newPrediction.dislikes.splice(userDislikesIndex, 1); }
        } else {
            if (userDislikesIndex !== -1) newPrediction.dislikes.splice(userDislikesIndex, 1);
            else { newPrediction.dislikes.push(userId); if (userLikesIndex !== -1) newPrediction.likes.splice(userLikesIndex, 1); }
        }
        setPrediction(newPrediction);

        // API call
        axios.post(`${import.meta.env.VITE_API_URL}/api/predictions/${predictionId}/${voteType}`, {}, { withCredentials: true })
            .catch(() => { toast.error(t("Vote failed.")); setPrediction(originalPrediction); });
    };

    // --- This function PREPARES the share content ---
    const openShareModal = () => {
        if (!prediction) return;

        const url = window.location.href;
        // Use prediction.userId (which is populated)
        const isOwner = currentUser?._id === prediction.userId?._id;
        const isAssessed = prediction.status === 'Assessed';

        const params = {
            ticker: prediction.stockTicker,
            targetPrice: formatCurrency(prediction.targetPrice, i18n.language, prediction.currency),
            // --- THIS IS THE FIX ---
            // We now pass the translated timeframe instead of the date.
            deadline: t(`prediction_timeframes.${prediction.predictionType.toLowerCase()}`),
            // --- END FIX ---
            username: prediction.userId.username,
            rating: (prediction.rating || prediction.score)?.toFixed(1), // Use 'rating' or 'score'
            actualPrice: formatCurrency(prediction.actualPrice, i18n.language, prediction.currency),
        };

        let messageKey;
        if (isOwner) {
            messageKey = isAssessed ? 'share.ownerAssessed' : 'share.ownerActive';
        } else {
            messageKey = isAssessed ? 'share.visitorAssessed' : 'share.visitorActive';
        }

        const text = t(messageKey, params);

        // Set the content for the modal and open it
        setShareContent({ text, url });
        setIsShareModalOpen(true);
    };

    // --- RENDER GUARDS ---
    if (loading) return <div className="text-center text-white">{t("Loading Prediction...")}</div>;
    // This guard is CRITICAL. It waits until prediction is loaded.
    if (!prediction) return <div className="text-center text-white">{t("Prediction not found.")}</div>;

    // --- 2. CREATE DYNAMIC SEO CONTENT (AFTER GUARDS) ---
    const username = prediction.userId.username;
    const stockTicker = prediction.stockTicker;
    const predictionType = t(`predictionTypes.${prediction.predictionType.toLowerCase()}`);

    const pageTitle = t('seo.prediction_page.title', {
        username: username,
        type: predictionType,
        ticker: stockTicker
    });
    const pageDescription = t('seo.prediction_page.description', {
        username: username,
        type: predictionType,
        ticker: stockTicker
    });
    // --- END ---

    // --- ALL LOGIC MOVED AFTER THE GUARDS ---
    // This is now safe because `prediction` is guaranteed to exist.
    const isOwner = currentUser?._id === prediction.userId?._id;
    const isAssessed = prediction.status === 'Assessed';

    // FIX: Use the correct isMarketOpen with ticker
    const marketIsOpenNow = isMarketOpen(prediction.stockTicker, currentQuote?.marketState);

    // Use `currentQuote.displayPrice` as it's the standardized field
    const ratingLabel = isAssessed ? t("Final Rating") : (marketIsOpenNow ? t("Live Rating") : t("Rating at Close")); 
    
    // Example of a fix:
    // 1. Get the price
    const currentPrice = isAssessed ? prediction.actualPrice : currentQuote?.displayPrice;

    // 2. Get the label
    // This logic is now simple and correct for a 24/7 asset like BTC.
    const priceLabel = isAssessed ? t("Actual Price") : t("Current Price");

    let rating = isAssessed ? prediction.rating : calculateLiveScore(prediction.targetPrice, currentPrice); // <-- Renamed
    const formattedRating = typeof rating === 'number' ? rating.toFixed(1) : rating; // <-- Renamed
    const userLike = currentUser && (prediction.likes || []).includes(currentUser._id);
    const userDislike = currentUser && (prediction.dislikes || []).includes(currentUser._id);
    const hasInitialPrice = typeof prediction.priceAtCreation === 'number';

    let percentFromCurrent = null;
    if (typeof currentPrice === 'number' && currentPrice > 0) {
        percentFromCurrent = ((prediction.targetPrice - currentPrice) / currentPrice) * 100;
    }

    return (
        <>
            <Helmet>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
            </Helmet>
            {/* --- Render the ShareModal --- */}

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                title={t('prediction.shareTitle', 'Share Prediction')}
                text={shareContent.text}
                url={shareContent.url}
                shareContext={{ context: 'prediction', ticker: prediction.stockTicker }}
            />

            <DescriptionModal isOpen={isDescModalOpen} onClose={() => setIsDescModalOpen(false)} description={prediction.description} />
            <EditPredictionModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} prediction={prediction} onUpdate={fetchData} />
            <PredictionHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} prediction={prediction} />

            <div className="max-w-2xl mx-auto animate-fade-in">
                <div className="bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <Link to={`/stock/${prediction.stockTicker}`} className="text-3xl font-bold text-white hover:underline">{prediction.stockTicker}</Link>
                            <p className="text-gray-400">
                                {t('prediction_type', { type: t(`predictionTypes.${prediction.predictionType.toLowerCase()}`) })}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`text-sm px-3 py-1 rounded-full font-semibold ${isAssessed ? 'bg-gray-700 text-gray-300' : 'bg-blue-500 text-white'}`}>
                                {t(`predictionStatus.${prediction.status}`)}
                            </div>
                            {/* --- SHARE BUTTON UPDATED --- */}
                            <button onClick={openShareModal} title={t('prediction.share_title')} className="text-gray-400 hover:text-white">
                                <ShareIcon />
                            </button>
                        </div>
                    </div>

                    {hasInitialPrice ? (
                        <PredictionJourney
                            initial={prediction.priceAtCreation}
                            target={prediction.targetPrice}
                            current={currentPrice}
                            priceLabel={priceLabel}
                        />
                    ) : (
                        <div className="my-8 text-center text-gray-500 text-sm">
                            {t("(Price journey visual is not available for this older prediction)")}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                        <div className="bg-gray-700 p-4 rounded-lg flex flex-col justify-center">
                            <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
                                {t("Target Price")}
                                {prediction.description && (
                                    <button onClick={() => setIsDescModalOpen(true)} className="text-gray-500 hover:text-white" title={t("View Rationale")}>
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                                    </button>
                                )}
                                {/* --- This is line 279 --- */}
                                {isOwner && prediction.status === 'Active' && (
                                    <button onClick={() => setIsEditModalOpen(true)} title="Edit Prediction" className="text-gray-500 hover:text-white">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536l10.732-10.732z"></path></svg>
                                    </button>
                                )}
                                {prediction.history && prediction.history.length > 0 && (
                                    <button onClick={() => setIsHistoryModalOpen(true)} title="View Edit History" className="text-gray-500 hover:text-white">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    </button>
                                )}
                            </p>
                            <p className="text-3xl font-bold text-white">{formatCurrency(prediction.targetPrice, i18n.language, prediction.currency)}</p>
                            {percentFromCurrent !== null && (
                                <p className={`text-sm font-bold ${percentFromCurrent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ({formatPercentage(percentFromCurrent, i18n.language)})
                                </p>
                            )}
                        </div>

                        <div className="bg-gray-700 p-4 rounded-lg flex flex-col justify-center">
                            <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
                                {isAssessed ? t("Final Rating") : ratingLabel}
                            </p>
                            <p className={`text-3xl font-bold ${typeof rating === 'number' && rating > 60 ? 'text-green-400' : 'text-red-400'}`}>{formattedRating}</p>
                        </div>
                    </div>

                    {!isAssessed && (
                        <div className="mt-4 text-center bg-gray-700 p-2 rounded-lg">
                            <p className="text-sm text-gray-400">{t("Time Remaining")}</p>
                            <p className="font-mono text-white">{timeLeft}</p>
                        </div>
                    )}

                    <div className="mt-6 pt-6 border-t border-gray-700">
                        <div className="relative mb-4">
                            <h3 className="text-center text-sm text-gray-400 font-bold">{t("DO YOU AGREE?")}</h3>
                            <div className="absolute right-0 top-0 text-sm text-gray-400 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-eye" viewBox="0 0 16 16">
                                    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z" />
                                    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z" />
                                </svg>
                                <span>{prediction.views.toLocaleString(i18n.language)}</span>
                            </div>
                        </div>
                        <div className="flex justify-center items-center gap-8 text-gray-400">
                            <button onClick={() => handleVote('like')} className={`flex items-center gap-2 font-bold text-2xl transition-colors ${userLike ? 'text-green-500' : 'hover:text-white'}`} disabled={isAssessed} title={t("Agree")}>
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.562 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"></path></svg>
                                <span>{(prediction.likes || []).length}</span>
                            </button>
                            <button onClick={() => handleVote('dislike')} className={`flex items-center gap-2 font-bold text-2xl transition-colors ${userDislike ? 'text-red-500' : 'hover:text-white'}`} disabled={isAssessed} title={t("Disagree")}>
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.641a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.438 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.2-1.867a4 4 0 00.8-2.4z"></path></svg>
                                <span>{(prediction.dislikes || []).length}</span>
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-gray-700 mt-6 pt-4 flex items-center">
                        <img src={prediction.userId.avatar} alt="avatar" className={`w-10 h-10 rounded-full border-2 ${prediction.userId.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`} />
                        <div className="ml-3">
                            <p className="text-sm text-gray-400">{t("Predicted by")}</p>
                            <div className="flex items-center">
                                <Link to={`/profile/${prediction.userId._id}`} className="font-semibold text-white hover:underline break-words">
                                    {prediction.userId.username.split(' ').slice(0, -1).join(' ')}
                                    <span style={{ whiteSpace: 'nowrap' }}>
                                        {' '}{prediction.userId.username.split(' ').slice(-1).join(' ')}
                                        {settings?.isVerificationEnabled && prediction.userId.isVerified && (
                                            <span className="ml-1 inline-block align-middle">
                                                <VerifiedTick />
                                            </span>
                                        )}
                                    </span>
                                </Link>
                            </div>
                        </div>
                        <p className="ml-auto text-sm text-gray-500 text-right">{t("Made on")} {formatNumericDate(prediction.createdAt, i18n.language)}</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PredictionDetailPage;