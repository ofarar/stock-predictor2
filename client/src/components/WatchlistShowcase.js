import React from 'react';
import { Link } from 'react-router-dom';

const WatchlistShowcase = ({ stocks = [] }) => {
    return (
        <div className="bg-gray-800 rounded-lg py-6">
            <h3 className="text-xl font-bold text-white px-6 mb-4">Watchlist</h3>
            {stocks.length > 0 ? (
                <div className="flex flex-wrap gap-3 px-6">
                    {stocks.map(stock => (
                        <Link
                            key={stock.symbol}
                            to={`/stock/${stock.symbol}`}
                            className="bg-gray-700 text-white font-bold text-sm py-2 px-4 rounded-full transition-colors hover:bg-green-500"
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