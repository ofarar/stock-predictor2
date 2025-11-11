// src/components/CommunitySentiment.js
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatPercentage } from '../utils/formatters';

// This is the new, more visual card for a single timeframe
const SentimentCard = ({ type, data, currentPrice }) => {
    const { t, i18n } = useTranslation();
    
    if (!data) return null;

    const { avgTargetPrice, count } = data;
    const percentageChange = currentPrice > 0 ? ((avgTargetPrice - currentPrice) / currentPrice) * 100 : 0;
    const isBullish = percentageChange >= 0;

    return (
        <div className="bg-gray-700 p-4 rounded-lg flex-1 min-w-[150px]">
            <h4 className="text-sm font-bold text-gray-400">{t(`sentiment.${type.toLowerCase()}`)}</h4>
            <p className="text-2xl font-bold text-white mt-1">
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
    );
};

const CommunitySentiment = ({ ticker, currentPrice, sentiments }) => {
    const { t } = useTranslation();

    if (!sentiments || sentiments.length === 0) {
        return null; // Don't render anything if no data
    }

    // Create a map of the data for easy access
    const sentimentMap = sentiments.reduce((acc, s) => {
        acc[s.type] = s;
        return acc;
    }, {});

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
            
            {/* Horizontal scrolling container for the cards */}
            <div className="flex gap-4 overflow-x-auto pb-2 modern-scrollbar">
                <SentimentCard type="Daily" data={sentimentMap.Daily} currentPrice={currentPrice} />
                <SentimentCard type="Weekly" data={sentimentMap.Weekly} currentPrice={currentPrice} />
                <SentimentCard type="Monthly" data={sentimentMap.Monthly} currentPrice={currentPrice} />
                <SentimentCard type="Quarterly" data={sentimentMap.Quarterly} currentPrice={currentPrice} />
                <SentimentCard type="Yearly" data={sentimentMap.Yearly} currentPrice={currentPrice} />
                <SentimentCard type="Hourly" data={sentimentMap.Hourly} currentPrice={currentPrice} />
            </div>
        </div>
    );
};

export default CommunitySentiment;