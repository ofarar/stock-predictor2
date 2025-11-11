import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils/formatters';

const SentimentStockCard = ({ stock }) => {
    const { t, i18n } = useTranslation();

    if (!stock.quote) {
        return (
            <Link to={`/stock/${stock.ticker}`} className="bg-gray-800 p-4 rounded-lg flex items-center justify-center text-center text-gray-400 hover:bg-gray-700 h-full">
                <div>
                    <p className="font-bold text-white">{stock.ticker}</p>
                    <p className="text-sm">{t('famousStocks.noData')}</p>
                </div>
            </Link>
        );
    }

    const hasSentiment = stock.sentiment && Object.keys(stock.sentiment).length > 0;
    const relevantSentimentType = hasSentiment ? (['Daily', 'Weekly', 'Monthly'].find(type => stock.sentiment[type]) || Object.keys(stock.sentiment)[0]) : null;
    const sentimentData = relevantSentimentType ? stock.sentiment[relevantSentimentType] : null;

    if (!sentimentData) {
        return (
             <Link to={`/stock/${stock.ticker}`} className="bg-gray-800 p-4 rounded-lg flex items-center justify-between hover:bg-gray-700 h-full">
                <div>
                    <p className="font-bold text-white">{stock.quote.shortName || stock.ticker}</p>
                    <p className="text-sm text-gray-400">{stock.ticker}</p>
                </div>
                <p className="font-bold text-lg text-white">{formatCurrency(stock.quote.regularMarketPrice, i18n.language, stock.quote.currency)}</p>
            </Link>
        );
    }

    return (
        <Link to={`/stock/${stock.ticker}`} className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors flex flex-col justify-between h-full">
            <div>
                <p className="text-sm text-gray-400 mb-2">
                    {t('sentiment.question', { context: relevantSentimentType, ticker: stock.ticker })}
                </p>
            </div>
            <div className="text-right">
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
    const [prevTickers, setPrevTickers] = useState([]);
    const [updatedTickers, setUpdatedTickers] = useState(new Set());

    useEffect(() => {
        const currentTickers = stocks.map(s => s.ticker);
        // Only animate if the component was already mounted (prevTickers has been set)
        if (prevTickers.length > 0) {
            const newTickers = currentTickers.filter(t => !prevTickers.includes(t));
            if (newTickers.length > 0) {
                const newSet = new Set(newTickers);
                setUpdatedTickers(newSet);
                const timer = setTimeout(() => {
                    setUpdatedTickers(new Set());
                }, 1000); // Animation duration should match CSS
                return () => clearTimeout(timer);
            }
        }
        setPrevTickers(currentTickers);
    }, [stocks]);

    const validStocks = stocks?.filter(stock => stock.quote) || [];

    if (validStocks.length === 0) {
        return null;
    }

    return (
        <div>
            <h3 className="text-xl font-bold text-white mb-4">
                {isHistorical ? t('famousStocks.titleHistorical') : t('famousStocks.titleToday')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {validStocks.map(stock => (
                    <div key={stock.ticker} className={updatedTickers.has(stock.ticker) ? 'animate-fade-in' : ''}>
                        <SentimentStockCard stock={stock} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FamousStocks;