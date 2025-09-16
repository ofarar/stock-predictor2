import React from 'react';

const marketData = [
    { name: 'S&P 500', value: '5,123.68', change: '+0.52%', isUp: true },
    { name: 'NASDAQ', value: '16,091.92', change: '+1.14%', isUp: true },
    { name: 'Bitcoin', value: '$68,450.21', change: '-2.31%', isUp: false },
];

const MarketOverview = () => (
    <div className="w-full bg-gray-800 p-4 rounded-lg shadow-lg">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            {marketData.map(item => (
                <div key={item.name}>
                    <p className="text-sm text-gray-400">{item.name}</p>
                    <p className="text-lg font-bold text-white">{item.value}</p>
                    <p className={`text-sm font-semibold ${item.isUp ? 'text-green-400' : 'text-red-400'}`}>{item.change}</p>
                </div>
            ))}
        </div>
    </div>
);

export default MarketOverview;