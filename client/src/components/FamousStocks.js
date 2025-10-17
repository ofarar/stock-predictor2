import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Accept the new isHistorical prop
const FamousStocks = ({ stocks = [], isHistorical = false }) => {
    const { t } = useTranslation();

    // Adjust title based on the data type
    const titleText = isHistorical 
        ? t('famousStocks.title_historical', 'Trending (Last 7 Days)') 
        : t('famousStocks.title'); // Your original title key

    // Adjust item text based on the data type
    const itemTextKey = isHistorical 
        ? 'famousStocks.predictionsText_historical' // e.g., "{{count}} predictions (7d)"
        : 'famousStocks.predictionsText';         // e.g., "{{count}} predictions today"

    return (
        <div className="bg-gray-800 p-6 rounded-xl">
            <div className="flex items-center mb-4">
                {/* SVG Icon */}
                <h3 className="text-xl font-bold text-white">{titleText}</h3>
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
                                {t(itemTextKey, { count: stock.predictions })}
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