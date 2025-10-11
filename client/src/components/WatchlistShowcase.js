import React from 'react';
import { Link } from 'react-router-dom';

const WatchlistShowcase = ({ stocks = [] }) => {
    return (
        <div className="bg-gray-800 rounded-lg py-6">
            <h3 className="text-xl font-bold text-white px-6 mb-4">Watchlist</h3>
            {stocks.length > 0 ? (
                // --- FIX: The list is now left-aligned and horizontally scrollable ---
                <div className="flex gap-3 overflow-x-auto pb-4 px-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {stocks.map(stock => (
                        <Link
                            key={stock.symbol}
                            to={`/stock/${stock.symbol}`}
                            className="flex-shrink-0 bg-gray-700 text-white font-bold text-sm py-2 px-4 rounded-full transition-colors hover:bg-green-500"
                            title={`View ${stock.longName || stock.symbol}`}
                        >
                            {stock.symbol}
                        </Link>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500 px-6">This user is not watching any stocks yet.</p>
            )}
        </div>
    );
};

export default WatchlistShowcase;