// src/pages/PredictionDetailPage.js

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import DescriptionModal from '../components/DescriptionModal';
import toast from 'react-hot-toast';

const formatTimeLeft = (deadline) => {
    const total = Date.parse(deadline) - Date.parse(new Date());
    if (total < 0) return "Awaiting Assessment";
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

const calculateLiveScore = (predictedPrice, actualPrice) => {
    if (!actualPrice) return '...';
    const MAX_SCORE = 100;
    const MAX_ERROR_PERCENTAGE = 0.20;
    if (actualPrice === 0) return 0;
    const error = Math.abs(predictedPrice - actualPrice);
    const errorPercentage = error / actualPrice;
    if (errorPercentage > MAX_ERROR_PERCENTAGE) return 0;
    return MAX_SCORE * (1 - (errorPercentage / MAX_ERROR_PERCENTAGE));
};

const PredictionDetailPage = ({ requestLogin }) => {
    const { predictionId } = useParams();
    const [prediction, setPrediction] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentQuote, setCurrentQuote] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');
    const [loading, setLoading] = useState(true);
    const [isDescModalOpen, setIsDescModalOpen] = useState(false);

    useEffect(() => {
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
        }).catch(err => {
            console.error("Failed to fetch page data", err);
            toast.error("Could not load prediction details.");
        }).finally(() => {
            setLoading(false);
        });
    }, [predictionId]);

    useEffect(() => {
        if (prediction?.status === 'Active') {
            const timer = setInterval(() => {
                setTimeLeft(formatTimeLeft(prediction.deadline));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [prediction]);

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
            else {
                newPrediction.likes.push(userId);
                if (userDislikesIndex !== -1) newPrediction.dislikes.splice(userDislikesIndex, 1);
            }
        } else {
            if (userDislikesIndex !== -1) newPrediction.dislikes.splice(userDislikesIndex, 1);
            else {
                newPrediction.dislikes.push(userId);
                if (userLikesIndex !== -1) newPrediction.likes.splice(userLikesIndex, 1);
            }
        }
        setPrediction(newPrediction);

        axios.post(`${process.env.REACT_APP_API_URL}/api/predictions/${predictionId}/${voteType}`, {}, { withCredentials: true })
            .catch(() => {
                toast.error("Vote failed.");
                setPrediction(originalPrediction);
            });
    };

    if (loading) return <div className="text-center text-white">Loading Prediction...</div>;
    if (!prediction) return <div className="text-center text-white">Prediction not found.</div>;

    const isAssessed = prediction.status === 'Assessed';
    const statusBgColor = isAssessed ? 'bg-gray-700' : 'bg-blue-500';
    const statusTextColor = isAssessed ? 'text-gray-300' : 'text-white';

    let liveScore = isAssessed ? prediction.score : calculateLiveScore(prediction.targetPrice, currentQuote?.regularMarketPrice);
    const liveScoreColor = typeof liveScore === 'number' && liveScore > 60 ? 'text-green-400' : 'text-red-400';

    const formattedScore = typeof liveScore === 'number' ? liveScore.toFixed(1) : liveScore;

    const userLike = currentUser && (prediction.likes || []).includes(currentUser._id);
    const userDislike = currentUser && (prediction.dislikes || []).includes(currentUser._id);

    return (
        <>
            <DescriptionModal
                isOpen={isDescModalOpen}
                onClose={() => setIsDescModalOpen(false)}
                description={prediction.description}
            />
            <div className="max-w-4xl mx-auto animate-fade-in">
                <div className="bg-gray-800 p-8 rounded-xl shadow-2xl">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                        <div>
                            <div className="flex items-center gap-3">
                                <Link to={`/stock/${prediction.stockTicker}`} className="text-4xl font-bold text-white hover:underline">
                                    {prediction.stockTicker}
                                </Link>
                                {/* FIX: The duplicate info icon has been removed from this header section */}
                            </div>
                            <p className="text-sm text-gray-400 mt-1">{prediction.predictionType} Prediction</p>
                        </div>
                        <div className={`text-sm px-3 py-1 rounded-full font-semibold mt-3 sm:mt-0 ${statusBgColor} ${statusTextColor}`}>
                            {prediction.status}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                        {prediction.priceAtCreation && (
                            <div className="bg-gray-700 p-4 rounded-lg">
                                <p className="text-sm text-gray-400">Initial Price</p>
                                <p className="text-2xl font-bold text-white">${prediction.priceAtCreation.toFixed(2)}</p>
                            </div>
                        )}
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <div className="flex items-center justify-center gap-2">
                                <p className="text-sm text-gray-400">Predicted Price</p>
                                {prediction.description && (
                                    <button onClick={() => setIsDescModalOpen(true)} className="text-gray-500 hover:text-white" title="View Rationale">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                                    </button>
                                )}
                            </div>
                            <p className="text-2xl font-bold text-white">${prediction.targetPrice.toFixed(2)}</p>
                        </div>
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">{isAssessed ? 'Assessed Price' : 'Current Price'}</p>
                            <p className="text-2xl font-bold text-white">
                                {isAssessed ? `$${(prediction.actualPrice || 0).toFixed(2)}` : `$${currentQuote?.regularMarketPrice?.toFixed(2) || '...'}`}
                            </p>
                            {!isAssessed && <p className="text-xs text-gray-500 mt-1">Data delayed up to 15 minutes</p>}
                        </div>
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">{isAssessed ? 'Final Score' : 'Live Score'}</p>
                            <p className={`text-2xl font-bold ${liveScoreColor}`}>
                                {formattedScore}
                            </p>
                        </div>
                    </div>

                    {!isAssessed && (
                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-400">Time Remaining</p>
                            <p className="text-lg font-mono text-white">{timeLeft}</p>
                        </div>
                    )}

                    <div className="mt-6 pt-6 border-t border-gray-700">
                        <h3 className="text-center text-sm text-gray-400 font-bold mb-4">DO YOU AGREE WITH THIS PREDICTION?</h3>
                        <div className="flex justify-center items-center gap-6 text-gray-400">
                            <button onClick={() => handleVote('like')} className={`flex items-center gap-2 font-bold text-2xl transition-colors ${userLike ? 'text-green-500' : 'hover:text-white'}`} disabled={isAssessed} title="Agree">
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.562 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"></path></svg>
                                <span>{(prediction.likes || []).length}</span>
                            </button>
                            <button onClick={() => handleVote('dislike')} className={`flex items-center gap-2 font-bold text-2xl transition-colors ${userDislike ? 'text-red-500' : 'hover:text-white'}`} disabled={isAssessed} title="Disagree">
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.641a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.438 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.2-1.867a4 4 0 00.8-2.4z"></path></svg>
                                <span>{(prediction.dislikes || []).length}</span>
                            </button>
                        </div>
                        {isAssessed && <p className="text-center text-xs text-gray-500 mt-2">Voting is closed for assessed predictions.</p>}
                    </div>

                    <div className="border-t border-gray-700 mt-6 pt-4 flex items-center">
                        <img
                            src={prediction.userId.avatar || `https://avatar.iran.liara.run/public/boy?username=${prediction.userId._id}`}
                            alt="avatar"
                            className={`w-10 h-10 rounded-full border-2 ${prediction.userId.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`}
                        />
                        <div className="ml-3">
                            <p className="text-sm text-gray-400">Predicted by</p>
                            <Link to={`/profile/${prediction.userId._id}`} className="font-semibold text-white hover:underline">
                                {prediction.userId.username}
                            </Link>
                        </div>
                        <div className="ml-auto text-sm text-gray-500 text-right">
                            <span>Made on {new Date(prediction.createdAt).toLocaleDateString()}</span>
                            <br className="sm:hidden" />
                            <span className="sm:ml-2">{new Date(prediction.createdAt).toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PredictionDetailPage;