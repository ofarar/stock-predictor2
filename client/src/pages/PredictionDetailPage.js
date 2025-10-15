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
import { formatPercentage, formatCurrency, formatTimeLeft } from '../utils/formatters';

const calculateLiveScore = (predictedPrice, actualPrice) => {
    if (!actualPrice || actualPrice <= 0) return '...';
    const MAX_SCORE = 100;
    const MAX_ERROR_PERCENTAGE = 0.20;

    const error = Math.abs(predictedPrice - actualPrice);
    const errorPercentage = error / actualPrice;

    if (errorPercentage > MAX_ERROR_PERCENTAGE) {
        return 0;
    }

    const score = MAX_SCORE * (1 - (errorPercentage / MAX_ERROR_PERCENTAGE));
    return parseFloat(score.toFixed(1));
};

const isMarketOpen = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const day = now.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;
    const isAfterOpen = utcHour > 13 || (utcHour === 13 && now.getUTCMinutes() >= 30);
    const isBeforeClose = utcHour < 20;
    return isWeekday && isAfterOpen && isBeforeClose;
};

const PredictionDetailPage = ({ requestLogin, settings }) => {
    const { t, i18n } = useTranslation();
    const { predictionId } = useParams();
    const [prediction, setPrediction] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentQuote, setCurrentQuote] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');
    const [loading, setLoading] = useState(true);
    const [isDescModalOpen, setIsDescModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const fetchData = useCallback(() => {
        setLoading(true);
        Promise.all([
            axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true }),
            axios.get(`${process.env.REACT_APP_API_URL}/api/prediction/${predictionId}`)
        ]).then(([userRes, predictionRes]) => {
            setCurrentUser(userRes.data);
            const pred = predictionRes.data;
            setPrediction(pred);
            if (pred.status === 'Active') {
                return axios.get(`${process.env.REACT_APP_API_URL}/api/quote/${pred.stockTicker}`);
            }
        }).then(quoteRes => {
            if (quoteRes) {
                setCurrentQuote(quoteRes.data);
            }
        }).catch(() => toast.error(t("Could not load prediction details.")))
            .finally(() => setLoading(false));
    }, [predictionId, t]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (prediction?.status === 'Active') {
            const timer = setInterval(() => {
                const total = Date.parse(prediction.deadline) - Date.now();
                if (total < 0) {
                    setTimeLeft(t("Awaiting Assessment"));
                } else {
                    setTimeLeft(formatTimeLeft(total, t));
                }
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [prediction, t]);


    useEffect(() => {
        Promise.all([
            axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true }),
            axios.get(`${process.env.REACT_APP_API_URL}/api/prediction/${predictionId}`)
        ]).then(([userRes, predictionRes]) => {
            setCurrentUser(userRes.data);
            const pred = predictionRes.data;
            setPrediction(pred);
            if (pred.status === 'Active') {
                const initialTime = Date.parse(pred.deadline) - Date.now();
                if (initialTime < 0) {
                    setTimeLeft(t("Awaiting Assessment"));
                } else {
                    setTimeLeft(formatTimeLeft(initialTime, t));
                }
                // --- FIX ENDS HERE ---

                return axios.get(`${process.env.REACT_APP_API_URL}/api/quote/${pred.stockTicker}`);
            }
        }).then(quoteRes => {
            if (quoteRes) {
                setCurrentQuote(quoteRes.data);
            }
        }).catch(() => toast.error(t("Could not load prediction details.")))
            .finally(() => setLoading(false));
    }, [predictionId, t]);


    const handleVote = (voteType) => {
        if (!currentUser) return requestLogin();
        if (!prediction || prediction.status !== 'Active') return;
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
        axios.post(`${process.env.REACT_APP_API_URL}/api/predictions/${predictionId}/${voteType}`, {}, { withCredentials: true })
            .catch(() => { toast.error(t("Vote failed.")); setPrediction(originalPrediction); });
    };

    if (loading) return <div className="text-center text-white">{t("Loading Prediction...")}</div>;
    if (!prediction) return <div className="text-center text-white">{t("Prediction not found.")}</div>;

    const isAssessed = prediction.status === 'Assessed';
    const marketIsOpenNow = isMarketOpen();
    const currentPrice = isAssessed ? prediction.actualPrice : currentQuote?.displayPrice;
    const scoreLabel = marketIsOpenNow ? t("Live Score") : t("Score at Close");
    const priceLabel = marketIsOpenNow ? t("Current") : t("Closing Price");

    let score = isAssessed ? prediction.score : calculateLiveScore(prediction.targetPrice, currentPrice);
    const formattedScore = typeof score === 'number' ? score.toFixed(1) : score;
    const userLike = currentUser && (prediction.likes || []).includes(currentUser._id);
    const userDislike = currentUser && (prediction.dislikes || []).includes(currentUser._id);
    const hasInitialPrice = typeof prediction.priceAtCreation === 'number';

    let percentFromCurrent = null;
    if (typeof currentPrice === 'number' && currentPrice > 0) {
        percentFromCurrent = ((prediction.targetPrice - currentPrice) / currentPrice) * 100;
    }

    return (
        <>
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
                        <div className={`text-sm px-3 py-1 rounded-full font-semibold ${isAssessed ? 'bg-gray-700 text-gray-300' : 'bg-blue-500 text-white'}`}>
                            {t(`predictionStatus.${prediction.status}`)}
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
                                {/* --- ADD THESE ICONS --- */}
                                {currentUser?._id === prediction.userId._id && prediction.status === 'Active' && (
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
                            <p className="text-3xl font-bold text-white">{formatCurrency(prediction.targetPrice, i18n.language)}</p>
                            {percentFromCurrent !== null && (
                                <p className={`text-sm font-bold ${percentFromCurrent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ({formatPercentage(percentFromCurrent, i18n.language)})
                                </p>
                            )}
                        </div>

                        <div className="bg-gray-700 p-4 rounded-lg flex flex-col justify-center">
                            <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
                                {isAssessed ? t("Final Score") : scoreLabel}
                            </p>
                            <p className={`text-3xl font-bold ${typeof score === 'number' && score > 60 ? 'text-green-400' : 'text-red-400'}`}>{formattedScore}</p>
                        </div>
                    </div>

                    {!isAssessed && (
                        <div className="mt-4 text-center bg-gray-700 p-2 rounded-lg">
                            <p className="text-sm text-gray-400">{t("Time Remaining")}</p>
                            <p className="font-mono text-white">{timeLeft}</p>
                        </div>
                    )}

                    <div className="mt-6 pt-6 border-t border-gray-700">
                        <h3 className="text-center text-sm text-gray-400 font-bold mb-4">{t("DO YOU AGREE?")}</h3>
                        <div className="flex justify-center items-center gap-6 text-gray-400">
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
                            <div className="flex items-center gap-2">
                                <Link to={`/profile/${prediction.userId._id}`} className="font-semibold text-white hover:underline">
                                    {prediction.userId.username}
                                </Link>
                                {settings?.isVerificationEnabled && prediction.userId.isVerified && <VerifiedTick />}
                            </div>
                        </div>
                        <p className="ml-auto text-sm text-gray-500 text-right">{t("Made on")} {new Date(prediction.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PredictionDetailPage;
