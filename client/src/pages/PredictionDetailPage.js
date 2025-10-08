// src/pages/PredictionDetailPage.js

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

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

const PredictionDetailPage = () => {
    const { predictionId } = useParams();
    const [prediction, setPrediction] = useState(null);
    const [currentQuote, setCurrentQuote] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/api/prediction/${predictionId}`)
            .then(res => {
                const pred = res.data;
                setPrediction(pred);
                if (pred.status === 'Active') {
                    axios.get(`${process.env.REACT_APP_API_URL}/api/quote/${pred.stockTicker}`)
                         .then(quoteRes => setCurrentQuote(quoteRes.data));
                }
            })
            .catch(err => console.error("Failed to fetch prediction details", err))
            .finally(() => setLoading(false));
    }, [predictionId]);

    useEffect(() => {
        if (prediction?.status === 'Active') {
            const timer = setInterval(() => {
                setTimeLeft(formatTimeLeft(prediction.deadline));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [prediction]);

    if (loading) return <div className="text-center text-white">Loading Prediction...</div>;
    if (!prediction) return <div className="text-center text-white">Prediction not found.</div>;

    const isAssessed = prediction.status === 'Assessed';
    const statusBgColor = isAssessed ? 'bg-gray-700' : 'bg-blue-500';
    const statusTextColor = isAssessed ? 'text-gray-300' : 'text-white';
    
    let liveScore = isAssessed ? prediction.score : calculateLiveScore(prediction.targetPrice, currentQuote?.regularMarketPrice);
    const liveScoreColor = typeof liveScore === 'number' && liveScore > 60 ? 'text-green-400' : 'text-red-400';
    
    // FIX 1: Format score to one decimal place if it's a number
    const formattedScore = typeof liveScore === 'number' ? liveScore.toFixed(1) : liveScore;

     return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                    <div>
                        <p className="text-sm text-gray-400">{prediction.predictionType} Prediction</p>
                        <Link to={`/stock/${prediction.stockTicker}`} className="text-4xl font-bold text-white hover:underline">
                            {prediction.stockTicker}
                        </Link>
                    </div>
                    <div className={`text-sm px-3 py-1 rounded-full font-semibold mt-3 sm:mt-0 ${statusBgColor} ${statusTextColor}`}>
                        {prediction.status}
                    </div>
                </div>

                {/* FIX: Updated grid layout to 4 columns on large screens */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
                    {/* FIX: Added the new "Price at Creation" card (conditionally) */}
                    {prediction.priceAtCreation && (
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <p className="text-sm text-gray-400">Initial Price</p>
                            <p className="text-2xl font-bold text-white">${prediction.priceAtCreation.toFixed(2)}</p>
                        </div>
                    )}
                    
                    <div className="bg-gray-700 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">Predicted Price</p>
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

                <div className="border-t border-gray-700 mt-6 pt-4 flex items-center">
                    <img 
                        src={prediction.userId.avatar || `https-avatar.iran.liara.run/public/boy?username=${prediction.userId._id}`} 
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
    );
};

export default PredictionDetailPage;