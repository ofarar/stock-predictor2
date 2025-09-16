import React from 'react';
import { Link } from 'react-router-dom'; // Import Link

const movers = [
    { ticker: 'NVDA', price: '$950.02', change: '+8.47%', isUp: true },
    { ticker: 'SMCI', price: '$1044.02', change: '+6.12%', isUp: true },
    { ticker: 'TSLA', price: '$175.34', change: '-1.20%', isUp: false },
    { ticker: 'BA', price: '$202.61', change: '-2.81%', isUp: false },
];

const TopMovers = () => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-bold text-white mb-4">Top Movers</h3>
        <div className="space-y-3">
            {movers.map(mover => (
                <div key={mover.ticker} className="flex justify-between items-center">
                    <div>
                        {/* Make the ticker a clickable link */}
                        <Link to={`/stock/${mover.ticker}`} className="font-bold text-white hover:underline">{mover.ticker}</Link>
                        <p className="text-sm text-gray-400">{mover.price}</p>
                    </div>
                    <span className={`font-semibold px-2 py-1 rounded-md text-sm ${mover.isUp ? 'bg-green-500 bg-opacity-20 text-green-400' : 'bg-red-500 bg-opacity-20 text-red-400'}`}>
                        {mover.change}
                    </span>
                </div>
            ))}
        </div>
    </div>
);

export default TopMovers;