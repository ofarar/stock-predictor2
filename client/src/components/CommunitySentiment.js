import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { io } from 'socket.io-client';
import { formatCurrency, formatPercentage } from '../utils/formatters';

const SentimentCard = ({ type, avgTargetPrice, count, currentPrice, ticker, isUpdating }) => {
    const { t, i18n } = useTranslation();
    
    if (!avgTargetPrice) return null;

    const percentageChange = currentPrice > 0 ? ((avgTargetPrice - currentPrice) / currentPrice) * 100 : 0;
    const isBullish = percentageChange >= 0;

    const animationClass = isUpdating ? 'animate-flash' : '';

    return (
        <div className={`bg-gray-700 p-4 rounded-lg flex-1 min-w-[260px] flex flex-col justify-between transition-all duration-300 ${animationClass}`}>
            <h4 className="text-md font-semibold text-gray-300">
                {t('sentiment.question', { type: t(`sentiment.${type.toLowerCase()}`), ticker: ticker.toUpperCase() })}
            </h4>
            <div>
                <p className="text-3xl font-bold text-white mt-1">
                    {formatCurrency(avgTargetPrice, i18n.language, 'USD')}
                </p>
                <div className={`flex items-center text-sm font-bold ${isBullish ? 'text-green-400' : 'text-red-400'}`}>
                    {isBullish ? (
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V16a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V4a1 1 0 112 0v8.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    )}
                    <span>{formatPercentage(percentageChange, i18n.language)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">{t('sentiment.based_on_count', { count })}</p>
            </div>
        </div>
    );
};

const CommunitySentiment = ({ ticker, currentPrice }) => {
    const { t } = useTranslation();
    const [sentiments, setSentiments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(''); // State to track which card is updating

    useEffect(() => {
        const fetchCommunitySentiment = async () => {
            if (!ticker) return;
            setLoading(true);
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/community-sentiment/${ticker}`);
                setSentiments(res.data);
            } catch (err) {
                console.error("Community sentiment failed to load:", err);
                // Fails silently, doesn't block the page
            } finally {
                setLoading(false);
            }
        };

        fetchCommunitySentiment();

        // --- WebSocket Logic ---
        const socket = io(process.env.REACT_APP_API_URL);

        socket.on('connect', () => {
            console.log('Socket connected');
            if (ticker) {
                socket.emit('joinRoom', ticker.toUpperCase());
            }
        });

        socket.on('sentiment-update', (updatedSentiment) => {
            console.log('Sentiment update received:', updatedSentiment);
            setSentiments(currentSentiments => {
                // Find the type that has changed to trigger animation
                const changedType = updatedSentiment.find(newS => {
                    const oldS = currentSentiments.find(old => old.predictionType === newS.predictionType);
                    return !oldS || oldS.averageTarget !== newS.averageTarget || oldS.predictionCount !== newS.predictionCount;
                })?.predictionType;

                if (changedType) {
                    setUpdating(changedType);
                    setTimeout(() => setUpdating(''), 1000); // Reset animation state after 1s
                }
                return updatedSentiment;
            });
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        // Cleanup on component unmount
        return () => {
            socket.disconnect();
        };
        // --- End WebSocket Logic ---

    }, [ticker]);

    if (loading) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="bg-gray-700 p-4 rounded-lg flex-1 min-w-[150px]">
                                <div className="h-4 bg-gray-600 rounded w-1/2 mb-2"></div>
                                <div className="h-8 bg-gray-600 rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-gray-600 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!sentiments || sentiments.length === 0) {
        return null; // Don't render anything if no data
    }

    const sentimentMap = sentiments.reduce((acc, s) => {
        acc[s.predictionType] = s;
        return acc;
    }, {});

    const predictionOrder = ["Hourly", "Daily", "Weekly", "Monthly", "Quarterly", "Yearly"];

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                <div>
                    <h3 className="text-xl font-bold text-white">
                        {t('sentiment.title')}
                    </h3>
                    <p className="text-sm text-gray-400">{t('sentiment.subtitle')}</p>
                </div>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-2 modern-scrollbar">
                {predictionOrder.map(type => {
                    const sentiment = sentimentMap[type];
                    if (!sentiment) return null;
                    return (
                        <SentimentCard 
                            key={type}
                            ticker={ticker}
                            type={type} 
                            avgTargetPrice={sentiment.averageTarget} 
                            count={sentiment.predictionCount} 
                            currentPrice={currentPrice}
                            isUpdating={updating === type}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default CommunitySentiment;