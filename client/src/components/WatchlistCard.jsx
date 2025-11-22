// src/components/WatchlistCard.js
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatPercentage, formatCurrency } from '../utils/formatters';

const WatchlistCard = ({ quote, isSelected, isEditMode, onRemove, onClick }) => {
    const { t, i18n } = useTranslation();
    const priceChange = quote?.regularMarketChangePercent;

    return (
        <div className="relative flex-shrink-0 w-56">
            <button
                onClick={onClick}
                className={`w-full p-4 rounded-lg text-start transition-colors ${isSelected ? 'bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                disabled={isEditMode} // Disable clicking when in edit mode
            >
                <div className="flex justify-between items-baseline">
                    <p className="font-bold text-lg text-white">{quote.symbol}</p>
                    <p className="font-bold text-lg text-white">
                        {formatCurrency(quote.regularMarketPrice, i18n.language, quote.currency)}
                    </p>
                </div>
                <div className="flex justify-between items-baseline mt-1">
                    <p className="text-xs w-2/3 truncate">{quote.longName}</p>
                    <p className={`text-xs font-bold ${isSelected ? 'text-white' : priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPercentage(priceChange, i18n.language)}
                    </p>
                </div>
            </button>
            {/* Show remove button only when in edit mode */}
            {isEditMode && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="absolute top-1 end-1 p-1 bg-red-600 bg-opacity-75 rounded-full text-white hover:bg-red-500"
                    title={t('watchlistStockCard.removeButtonTitle', { symbol: quote.symbol })}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            )}
        </div>
    );
};

export default WatchlistCard;