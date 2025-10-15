// src/components/BadgeDetailModal.js

import React from 'react';

const badgeStyles = {
    Bronze: { color: 'text-yellow-600', icon: '🥉' },
    Silver: { color: 'text-gray-400', icon: '🥈' },
    Gold: { color: 'text-yellow-400', icon: '🥇' },
};

const BadgeDetailModal = ({ badge, onClose }) => {
    if (!badge) return null;

    const style = badgeStyles[badge.tier] || { color: 'text-gray-500', icon: '⚫' };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-sm text-center relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <span className={`text-7xl ${style.color}`}>{style.icon}</span>
                <h2 className="text-2xl font-bold text-white mt-4">{badge.name}</h2>
                <p className={`font-semibold ${style.color}`}>{badge.tier} Tier</p>
                <p className="text-gray-400 mt-2 text-sm">{badge.description}</p>
            </div>
        </div>
    );
};

export default BadgeDetailModal;