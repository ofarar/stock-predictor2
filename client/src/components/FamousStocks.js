// src/components/FamousStocks.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const FamousStocks = ({ stocks = [] }) => {
    const { t } = useTranslation();

    return (
        <div className="bg-gray-800 p-6 rounded-xl">
            <div className="flex items-center mb-4">
                <svg className="w-6 h-6 text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                </svg>
                <h3 className="text-xl font-bold text-white">{t('famousStocks.title')}</h3>
            </div>

            <div className="space-y-3">
                {stocks.length > 0 ? (
                    stocks.map(stock => (
                        <Link
                            to={`/stock/${stock.ticker}`}
                            key={stock.ticker}
                            className="flex justify-between items-center bg-gray-700 p-3 rounded-lg hover:bg-gray-600"
                        >
                            <span className="font-bold text-white">{stock.ticker}</span>
                            <span className="text-sm text-gray-400">
                                {t('famousStocks.predictionsText', { count: stock.predictions })}
                            </span>
                        </Link>
                    ))
                ) : (
                    <p className="text-gray-500 text-center py-4">{t('famousStocks.noData')}</p>
                )}
            </div>
        </div>
    );
};

export default FamousStocks;
