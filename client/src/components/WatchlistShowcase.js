// src/components/WatchlistShowcase.js

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const WatchlistShowcase = ({ stocks = [] }) => {
    const { t } = useTranslation();

    return (
        <div className="bg-gray-800 rounded-lg py-6">
            <h3 className="text-xl font-bold text-white px-6 mb-4">{t('watchlistShowcase.title')}</h3>
            {stocks.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-4 px-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {stocks.map(stock => (
                        <Link
                            key={stock.symbol}
                            to={`/stock/${stock.symbol}`}
                            className="flex-shrink-0 bg-gray-700 text-white font-bold text-sm py-2 px-4 rounded-full transition-colors hover:bg-green-500"
                            title={t('watchlistShowcase.viewStock', { stock: stock.longName || stock.symbol })}
                        >
                            {stock.symbol}
                        </Link>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 px-6">{t('watchlistShowcase.noStocks')}</p>
            )}
        </div>
    );
};

export default WatchlistShowcase;
