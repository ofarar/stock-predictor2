// src/components/Badge.js

import React from 'react';

const badgeStyles = {
    Bronze: { color: 'text-yellow-600', icon: '🥉' },
    Silver: { color: 'text-gray-400', icon: '🥈' },
    Gold: { color: 'text-yellow-400', icon: '🥇' },
};

const Badge = ({ name, tier, onClick }) => {
    const style = badgeStyles[tier] || { color: 'text-gray-500', icon: '⚫' };

    return (
        <button 
            onClick={onClick} 
            // FIX: Adjusted width, padding, and text sizes for a smaller look
            className="flex-shrink-0 w-40 bg-gray-700 p-3 rounded-lg text-center transition-transform hover:-translate-y-1"
        >
            <span className={`text-4xl`}>{style.icon}</span>
            <p className="font-bold text-white text-sm mt-1 truncate">{name}</p>
            <p className={`text-xs font-semibold ${style.color}`}>{tier}</p>
        </button>
    );
};

export default Badge;