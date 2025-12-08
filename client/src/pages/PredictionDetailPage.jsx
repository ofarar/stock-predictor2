// src/pages/PredictionDetailPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import DescriptionModal from '../components/DescriptionModal';
import PredictionJourney from '../components/PredictionJourney';
import VerifiedTick from '../components/VerifiedTick';
import { useTranslation } from 'react-i18next';
import EditPredictionModal from '../components/EditPredictionModal';
import PredictionHistoryModal from '../components/PredictionHistoryModal';
import { formatPercentage, formatCurrency, formatTimeLeft, formatNumericDate } from '../utils/formatters';
import ShareModal from '../components/ShareModal';
import { Helmet } from 'react-helmet-async';
import { isMarketOpen } from '../utils/timeHelpers';
import PromoBanner from '../components/PromoBanner';
import { getShareBaseUrl } from '../utils/urlHelper';
import { FaShareAlt, FaTrash } from 'react-icons/fa';
import ConfirmationModal from '../components/ConfirmationModal';

const calculateLiveScore = (predictedPrice, actualPrice, priceAtCreation) => {
    if (!actualPrice || actualPrice <= 0) return '...';

    // --- FIX: Direction Check added here ---
    if (typeof priceAtCreation === 'number' && priceAtCreation > 0) {
        const predictedDirection = predictedPrice - priceAtCreation;
        const actualDirection = actualPrice - priceAtCreation;

        // If predicted direction is opposite of actual direction, score is 0.
        if (predictedDirection * actualDirection < 0) {
            return 0;
        }
    }

    const MAX_SCORE = 100;
    const MAX_ERROR_PERCENTAGE = 0.20;
    const error = Math.abs(predictedPrice - actualPrice);
    const errorPercentage = error / actualPrice;
    if (errorPercentage > MAX_ERROR_PERCENTAGE) return 0;
    const rating = MAX_SCORE * (1 - (errorPercentage / MAX_ERROR_PERCENTAGE));
    return parseFloat(rating.toFixed(1));
};

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
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const navigate = useNavigate();

    // --- CONSOLIDATED DATA FETCHING ---
    const fetchData = useCallback(() => {
        setLoading(true);
        axios.get(`${import.meta.env.VITE_API_URL}/api/prediction/${predictionId}`, { withCredentials: true })
            .then(predictionRes => {
                const pred = predictionRes.data;
                setPrediction(pred);
                if (pred.status === 'Active') {
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

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- View Count Logic ---
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

    // Timer Logic
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
            updateTimer();
            const timer = setInterval(updateTimer, 1000);
            return () => clearInterval(timer);
        }
    }, [prediction, t]);

    // Live Price Update Logic
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
            }, 60000);
            return () => clearInterval(quoteTimer);
        }
    }, [prediction]);

    const [isVoting, setIsVoting] = useState(false);

    const handleVote = (voteType) => {
        // Logged-in check REMOVED to allow guests
        if (!prediction || prediction.status !== 'Active') return;
        if (isVoting) return; // Prevent double-voting/race conditions

        setIsVoting(true);
        const originalPrediction = { ...prediction };

        // Optimistic UI Update
        const newPrediction = { ...prediction };

        // Helper to toggle boolean and adjust count
        if (voteType === 'like') {
            if (newPrediction.userHasLiked) {
                // Toggle OFF
                newPrediction.userHasLiked = false;
                newPrediction.likeCount = Math.max(0, (newPrediction.likeCount || 0) - 1);
            } else {
                // Toggle ON
                newPrediction.userHasLiked = true;
                newPrediction.likeCount = (newPrediction.likeCount || 0) + 1;

                // If was disliked, remove dislike
                if (newPrediction.userHasDisliked) {
                    newPrediction.userHasDisliked = false;
                    newPrediction.dislikeCount = Math.max(0, (newPrediction.dislikeCount || 0) - 1);
                }
            }
        } else {
            // Dislike logic
            if (newPrediction.userHasDisliked) {
                // Toggle OFF
                newPrediction.userHasDisliked = false;
                newPrediction.dislikeCount = Math.max(0, (newPrediction.dislikeCount || 0) - 1);
            } else {
                // Toggle ON
                newPrediction.userHasDisliked = true;
                newPrediction.dislikeCount = (newPrediction.dislikeCount || 0) + 1;

                // If was liked, remove like
                if (newPrediction.userHasLiked) {
                    newPrediction.userHasLiked = false;
                    newPrediction.likeCount = Math.max(0, (newPrediction.likeCount || 0) - 1);
                }
            }
        }

        setPrediction(newPrediction);

        axios.post(`${import.meta.env.VITE_API_URL}/api/predictions/${predictionId}/${voteType}`, {}, { withCredentials: true })
            .then(res => {
                // Update with actual server logic/stats to be sure
                setPrediction(prev => {
                    const { userId, ...updatedFields } = res.data; // Exclude userId to prevent overwriting populated object
                    return {
                        ...prev,
                        ...updatedFields,
                        likeCount: res.data.stats ? res.data.stats.likes : prev.likeCount,
                        dislikeCount: res.data.stats ? res.data.stats.dislikes : prev.dislikeCount,
                        userHasLiked: res.data.stats ? res.data.stats.userHasLiked : prev.userHasLiked,
                        userHasDisliked: res.data.stats ? res.data.stats.userHasDisliked : prev.userHasDisliked
                    };
                });
            })
            .catch((err) => {
                console.error("Vote error", err);
                toast.error(t("Vote failed."));
                setPrediction(originalPrediction);
            })
            .finally(() => {
                setIsVoting(false);
            });
    };


    const openShareModal = () => {
        if (!prediction) return;

        const baseUrl = getShareBaseUrl();
        const url = `${baseUrl}/prediction/${predictionId}`;
        const isOwner = currentUser?._id === prediction.userId?._id;
        const isAssessed = prediction.status === 'Assessed';

        const params = {
            ticker: prediction.stockTicker,
            targetPrice: formatCurrency(prediction.targetPrice, i18n.language, prediction.currency),
            deadline: t(`prediction_timeframes.${prediction.predictionType.toLowerCase()}`),
            username: prediction.userId.username,
            rating: (prediction.rating || prediction.score)?.toFixed(1),
            actualPrice: formatCurrency(prediction.actualPrice, i18n.language, prediction.currency),
        };

        let messageKey;
        if (isOwner) {
            messageKey = isAssessed ? 'share.ownerAssessed' : 'share.ownerActive';
        } else {
            messageKey = isAssessed ? 'share.visitorAssessed' : 'share.visitorActive';
        }

        const text = t(messageKey, params);
        setShareContent({ text, url });
        setIsShareModalOpen(true);
        setIsShareModalOpen(true);
    };

    const confirmDeletePrediction = async () => {
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/predictions/${predictionId}`, { withCredentials: true });
            toast.success(t('prediction_deleted_success'));
            // Navigate back to the user's profile
            navigate(`/profile/${prediction.userId._id}`);
        } catch (error) {
            console.error("Failed to delete prediction:", error);
            toast.error(t('prediction_delete_failed'));
        } finally {
            setIsDeleteConfirmOpen(false);
        }
    };

    if (loading) return <div className="text-center text-white">{t("Loading Prediction...")}</div>;
    if (!prediction) return <div className="text-center text-white">{t("Prediction not found.")}</div>;

    const username = prediction.userId?.username || "Unknown User";
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

    const isOwner = currentUser?._id === prediction.userId?._id;
    const isAssessed = prediction.status === 'Assessed';
    const marketIsOpenNow = isMarketOpen(prediction.stockTicker, currentQuote?.marketState);
    const ratingLabel = isAssessed ? t("Final Rating") : (marketIsOpenNow ? t("Live Rating") : t("Rating at Close"));
    const currentPrice = isAssessed ? prediction.actualPrice : currentQuote?.displayPrice;
    const priceLabel = isAssessed ? t("explore_actual_price") : t("prediction.currentPrice");
    const targetHitStatus = isAssessed && prediction.targetHit;

    let rating = isAssessed
        ? prediction.rating
        // FIX: Pass the initial price (priceAtCreation) to the scoring function
        : calculateLiveScore(prediction.targetPrice, currentPrice, prediction.priceAtCreation);
    const formattedRating = typeof rating === 'number' ? rating.toFixed(1) : rating;
    const userLike = prediction.userHasLiked;
    const userDislike = prediction.userHasDisliked;
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
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "SocialMediaPosting",
                        "headline": pageTitle,
                        "datePublished": prediction.createdAt,
                        "author": {
                            "@type": "Person",
                            "name": username,
                            "url": `${import.meta.env.VITE_APP_URL || 'https://www.stockpredictorai.com'}/profile/${prediction.userId?._id}`
                        },
                        "articleBody": prediction.description || t('seo.prediction_default_body', { ticker: stockTicker, target: formatCurrency(prediction.targetPrice, i18n.language, prediction.currency) }),
                        "keywords": `${stockTicker}, Stock Prediction, ${predictionType}, Financial Forecast`,
                        "mainEntityOfPage": {
                            "@type": "WebPage",
                            "@id": window.location.href
                        }
                    })}
                </script>
            </Helmet>

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                title={t('prediction.shareTitle', 'Share Prediction')}
                text={shareContent.text}
                url={shareContent.url}
                shareContext={{ context: 'prediction', ticker: prediction.stockTicker }}
            />

            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={confirmDeletePrediction}
                title={t('confirm_delete_title', 'Delete Prediction')}
                message={t('confirm_delete_prediction', 'Are you sure you want to delete this prediction? This action cannot be undone and will recalculate user stats.')}
                confirmText={t('common.delete', 'Delete')}
                cancelText={t('common.cancel', 'Cancel')}
                isDistructive={true}
            />

            <DescriptionModal isOpen={isDescModalOpen} onClose={() => setIsDescModalOpen(false)} description={prediction.description} />
            <EditPredictionModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} prediction={prediction} onUpdate={fetchData} />
            <PredictionHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} prediction={prediction} />

            <div className="max-w-2xl mx-auto animate-fade-in">

                {/* --- 2. NEW: Promo Banner displayed for guests if enabled in settings --- */}
                {!currentUser && settings?.isPromoBannerActive && (
                    <div className="mb-6">
                        <PromoBanner />
                    </div>
                )}
                {/* --------------------------------------------------------------------- */}

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
                            {/* --- NEW: TARGET HIT STATUS BADGE --- */}
                            {targetHitStatus && (
                                <div className="text-sm px-3 py-1 rounded-full font-semibold bg-green-700 text-green-300">
                                    {t('prediction.targetHit', '🎯 Target Hit')}
                                </div>
                            )}
                            {/* ------------------------------------ */}
                            <button onClick={openShareModal} title={t('prediction.share_title')} className="text-gray-400 hover:text-white">
                                <FaShareAlt className="w-5 h-5" />
                            </button>
                            {currentUser?.isAdmin && (
                                <button
                                    onClick={() => setIsDeleteConfirmOpen(true)}
                                    title={t('Delete Prediction (Admin)')}
                                    className="text-gray-400 hover:text-red-500"
                                >
                                    <FaTrash className="w-5 h-5" />
                                </button>
                            )}
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
                            <div className="absolute end-0 top-0 text-sm text-gray-400 flex items-center gap-2">
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
                                <span>{prediction.likeCount || 0}</span>
                            </button>
                            <button onClick={() => handleVote('dislike')} className={`flex items-center gap-2 font-bold text-2xl transition-colors ${userDislike ? 'text-red-500' : 'hover:text-white'}`} disabled={isAssessed} title={t("Disagree")}>
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.641a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.438 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.2-1.867a4 4 0 00.8-2.4z"></path></svg>
                                <span>{prediction.dislikeCount || 0}</span>
                            </button>
                        </div>
                    </div>


                    <div className="border-t border-gray-700 mt-6 pt-4 flex items-center">
                        <img src={prediction.userId.avatar} alt="avatar" className={`w-10 h-10 rounded-full border-2 ${prediction.userId.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`} />
                        <div className="ms-3">
                            <p className="text-sm text-gray-400">{t("Predicted by")}</p>
                            <div className="flex items-center">
                                <Link to={`/profile/${prediction.userId?._id}`} className="font-semibold text-white hover:underline break-words">
                                    {(prediction.userId?.username || 'Unknown User').split(' ').slice(0, -1).join(' ')}
                                    <span style={{ whiteSpace: 'nowrap' }}>
                                        {' '}{(prediction.userId?.username || 'Unknown User').split(' ').slice(-1).join(' ')}
                                        {settings?.isVerificationEnabled && prediction.userId?.isVerified && (
                                            <span className="ms-1 inline-block align-middle">
                                                <VerifiedTick />
                                            </span>
                                        )}
                                    </span>
                                </Link>
                            </div>
                        </div>
                        <p className="ms-auto text-sm text-gray-500 text-end">{t("Made on")} {formatNumericDate(prediction.createdAt, i18n.language)}</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PredictionDetailPage;