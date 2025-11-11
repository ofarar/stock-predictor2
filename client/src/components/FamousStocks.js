// src/components/FamousStocks.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatPercentage } from '../utils/formatters';

const FamousStocks = ({ stocks = [], isHistorical = false }) => {
    const { t, i18n } = useTranslation();

    const titleText = isHistorical 
        ? t('famousStocks.title_historical', 'Trending (Last 7 Days)') 
        : t('famousStocks.title');

    return (
        <div className="bg-gray-800 p-6 rounded-xl">
            <div className="flex items-center mb-4">
                <svg className="w-6 h-6 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                </svg>
                <h3 className="text-xl font-bold text-white">{titleText}</h3>
            </div>

            <div className="space-y-3">
                {stocks.length > 0 ? (
                    stocks.map(stock => {
                        
                        // Extract new sentiment data
                        const sentiment = stock.sentiments && stock.sentiments[0];
                        let percentageChange = null;
                        if (sentiment && stock.currentPrice > 0) {
                            percentageChange = ((sentiment.avgTargetPrice - stock.currentPrice) / stock.currentPrice) * 100;
                        }
                        const isBullish = percentageChange !== null && percentageChange >= 0;

                        return (
                            <Link
                                to={`/stock/${stock.ticker}`}
                                key={stock.ticker}
                                className="block bg-gray-700 p-3 rounded-lg hover:bg-gray-600"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-white">{stock.ticker}</span>
                                    {/* --- NEW SENTIMENT UI --- */}
                                    {sentiment && (
                                        <div className={`flex items-center text-sm font-bold ${isBullish ? 'text-green-400' : 'text-red-400'}`}>
                                            {isBullish ? (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V16a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V4a1 1 0 112 0v8.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                            )}
                                            <span>{formatPercentage(percentageChange, i18n.language)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-sm text-gray-400">
                                        {formatCurrency(stock.currentPrice, i18n.language, 'USD')}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {t('famousStocks.predictionsText', { count: stock.predictions })}
                                    </span>
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <p className="text-gray-500 text-center py-4">{t('famousStocks.noData')}</p>
                )}
            </div>
        </div>
    );
};

export default FamousStocks;