import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { io } from 'socket.io-client'; // Import socket.io-client

const SentimentCard = ({ type, data, ticker, currentPrice, isUpdating }) => {
    const { t, i18n } = useTranslation();
    const { averageTarget, predictionCount } = data;

    const percentageChange =
        currentPrice && averageTarget
            ? ((averageTarget - currentPrice) / currentPrice) * 100
            : null;

    return (
        <div className={`bg-gray-700 p-4 rounded-lg flex-shrink-0 w-64 h-full flex flex-col justify-between transition-all duration-500 ${isUpdating ? 'animate-flash' : ''}`}>
            <div>
                <p className="text-sm text-gray-400 mb-2">
                    {t('sentiment.question', { type: t(`prediction_types.${type}`), ticker: ticker })}
                </p>
            </div>
            <div className="text-right">
                <div className="flex items-baseline justify-end gap-2">
                    {percentageChange !== null ? (
                        <p className={`text-sm font-bold ${percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatPercentage(percentageChange, i18n.language)}
                        </p>
                    ) : (
                        <p className="text-sm font-bold text-gray-500">
                            (...%)
                        </p>
                    )}
                    <p className="text-2xl font-bold text-white">
                        {formatCurrency(averageTarget, i18n.language)}
                    </p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    {t('sentiment.based_on_count', { count: predictionCount })}
                </p>
            </div>
        </div>
    );
};


const CommunitySentiment = ({ ticker, currentPrice }) => {
    const { t } = useTranslation();
    const [sentimentData, setSentimentData] = useState({});
    const [loading, setLoading] = useState(true);
    const [updatedTypes, setUpdatedTypes] = useState(new Set());

    useEffect(() => {
        const fetchSentiment = async () => {
            if (!ticker) return;
            setLoading(true);
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/community-sentiment/${ticker}`);
                setSentimentData(res.data || {});
            } catch (error) {
                console.error("Failed to fetch community sentiment:", error);
                setSentimentData({});
            } finally {
                setLoading(false);
            }
        };

        fetchSentiment();

        // --- START: REAL-TIME UPDATE LOGIC ---
        const socket = io(import.meta.env.VITE_API_URL);
        socket.emit('joinRoom', ticker);

        socket.on('sentiment-update', (newSentimentData) => {
            setSentimentData(prevData => {
                const changedTypes = new Set();
                // Find which sentiment types have new data
                for (const type in newSentimentData) {
                    if (!prevData[type] || prevData[type].predictionCount !== newSentimentData[type].predictionCount) {
                        changedTypes.add(type);
                    }
                }

                if (changedTypes.size > 0) {
                    setUpdatedTypes(changedTypes);
                    // Remove the animation class after it has played
                    setTimeout(() => setUpdatedTypes(new Set()), 1000);
                }

                return newSentimentData;
            });
        });

        // Disconnect on component unmount
        return () => {
            socket.emit('leaveRoom', ticker);
            socket.disconnect();
        };
        // --- END: REAL-TIME UPDATE LOGIC ---

    }, [ticker]);

    const orderedSentimentTypes = ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];
    const availableSentiments = orderedSentimentTypes.filter(type => sentimentData[type]);

    if (loading) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                <div className="h-8 bg-gray-700 rounded w-1/3 animate-pulse mb-4"></div>
                <div className="flex gap-4 overflow-x-auto pb-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-gray-700 p-4 rounded-lg flex-shrink-0 w-64 h-36 animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (availableSentiments.length === 0) {
        return null;
    }

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8 animate-fade-in">
            <div className="mb-4">
                <div>
                    <h3 className="text-xl font-bold text-white">
                        {t('sentiment.title')}
                    </h3>
                    <p className="text-sm text-gray-400">{t('sentiment.subtitle')}</p>
                </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 modern-scrollbar">
                {availableSentiments.map(type => (
                    <SentimentCard
                        key={type}
                        type={type}
                        data={sentimentData[type]}
                        ticker={ticker}
                        currentPrice={currentPrice}
                        isUpdating={updatedTypes.has(type)}
                    />
                ))}
            </div>
        </div>
    );
};

export default CommunitySentiment;