// src/components/FamousStocks.js
import React from 'react'; // <-- Removed useState, useEffect, useRef
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatPercentage } from '../utils/formatters';

const SentimentStockCard = ({ stock }) => {
    const { t, i18n } = useTranslation();

    if (!stock.quote) {
        return (
            <Link to={`/stock/${stock.ticker}`} className="bg-gray-700 p-4 rounded-lg flex items-center justify-center text-center text-gray-400 hover:bg-gray-600 h-full flex-shrink-0 w-64">
                <div>
                    <p className="font-bold text-white">{stock.ticker}</p>
                    <p className="text-sm">{t('famousStocks.noData')}</p>
                </div>
            </Link>
        );
    }

    const hasSentiment = stock.sentiment && Object.keys(stock.sentiment).length > 0;
    const relevantSentimentType = hasSentiment ? (['Hourly', 'Daily', 'Weekly', 'Monthly'].find(type => stock.sentiment[type]) || Object.keys(stock.sentiment)[0]) : null;
    const sentimentData = relevantSentimentType ? stock.sentiment[relevantSentimentType] : null;

    const dailyChangePercent = stock.quote?.regularMarketChangePercent;
    const isDailyUp = stock.quote?.regularMarketChange >= 0;

    let targetPercentageChange = null;
    let isTargetUp = false;
    if (sentimentData && typeof stock.quote.regularMarketPrice === 'number' && stock.quote.regularMarketPrice > 0) {
        targetPercentageChange = ((sentimentData.averageTarget - stock.quote.regularMarketPrice) / stock.quote.regularMarketPrice) * 100;
        isTargetUp = targetPercentageChange >= 0;
    }

    // This is the fallback card for when there is a quote, but NO sentiment.
    if (!sentimentData) {
        return (
            <Link to={`/stock/${stock.ticker}`} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between hover:bg-gray-600 h-full flex-shrink-0 w-64">
                <div>
                    <p className="font-bold text-white">{stock.quote.shortName || stock.ticker}</p>
                    <p className="text-sm text-gray-400">{stock.ticker}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg text-white">{formatCurrency(stock.quote.regularMarketPrice, i18n.language, stock.quote.currency)}</p>
                    {typeof dailyChangePercent === 'number' && (
                        <p className={`text-sm font-bold ${isDailyUp ? 'text-green-400' : 'text-red-400'}`}>
                            {formatPercentage(dailyChangePercent, i18n.language)}
                        </p>
                    )}
                </div>
            </Link>
        );
    }

    // This is the main card, for when quote AND sentiment exist.
    const translatedType = t(`prediction_types.${relevantSentimentType}`, relevantSentimentType);

    return (
        <Link to={`/stock/${stock.ticker}`} className="bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors flex flex-col justify-between h-full flex-shrink-0 w-64">
            <div>
                <p className="text-sm text-gray-400 mb-2">
                    {t('sentiment.question', { type: translatedType, ticker: stock.ticker })}
                </p>
            </div>
            <div className="text-right">
                {typeof targetPercentageChange === 'number' ? (
                    <p className={`text-sm font-bold ${isTargetUp ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPercentage(targetPercentageChange, i18n.language)}
                    </p>
                ) : (
                    <p className="text-sm font-bold text-gray-500">(...%)</p>
                )}
                <p className="text-2xl font-bold text-white">
                    {formatCurrency(sentimentData.averageTarget, i18n.language, stock.quote.currency)}
                </p>
                <p className="text-xs text-gray-500">
                    {t('sentiment.based_on_count', { count: sentimentData.predictionCount })}
                </p>
            </div>
        </Link>
    );
};

const FamousStocks = ({ stocks, isHistorical }) => {
    const { t } = useTranslation();
    
    // --- FIX 1: Removed unused useState, useRef, and useEffect ---

    const validStocks = stocks?.filter(stock => stock.quote) || [];

    if (validStocks.length === 0) {
        return null;
    }

    return (
        // --- FIX 2: Added the widget container ---
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4">
                {isHistorical ? t('famousStocks.title_historical') : t('famousStocks.title')}
            </h3>
            {/* This is the horizontal scroll layout you wanted */}
            <div className="flex gap-4 overflow-x-auto pb-2 modern-scrollbar">
                {validStocks.map(stock => (
                    <SentimentStockCard key={stock.ticker} stock={stock} />
                ))}
            </div>
        </div>
    );
};

export default FamousStocks;