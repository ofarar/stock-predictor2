// src/components/BadgeDetailModal.js

import React from 'react';
import { useTranslation } from 'react-i18next';

const badgeStyles = {
    Bronze: { color: 'text-yellow-600', icon: '🥉' },
    Silver: { color: 'text-gray-400', icon: '🥈' },
    Gold: { color: 'text-yellow-400', icon: '🥇' },
};

const BadgeDetailModal = ({ badge, onClose }) => {
    const { t } = useTranslation();
    if (!badge) return null;

    const getBadgeShareUrl = (badge) => {
        const url = window.location.href; // This will be the profile URL
        const icon = badgeStyles[badge.tier]?.icon || '🏆';
        const text = t('badgeDetailModal.shareTweet', {
            tier: t(`badges.tiers.${badge.tier}`, badge.tier), // Use translation for tier
            name: badge.name,
            icon: icon,
            url: url
        });
        return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    };

    const style = badgeStyles[badge.tier] || { color: 'text-gray-500', icon: '⚫' };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-sm text-center relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <span className={`text-7xl ${style.color}`}>{style.icon}</span>
                <h2 className="text-2xl font-bold text-white mt-4">{badge.name}</h2>
                {/* Correctly use translation for the tier display */}
                <p className={`font-semibold ${style.color}`}>{t(`badges.tiers.${badge.tier}`, `${badge.tier} Tier`)}</p>
                <p className="text-gray-400 mt-2 text-sm">{badge.description}</p>
                {/* --- NEW BUTTONS FOOTER --- */}
                <div className="flex justify-center gap-4 mt-8 pt-4 border-t border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700"
                    >
                        {t('common.close')}
                    </button>
                    <a
                        href={getBadgeShareUrl(badge)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 text-center flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13 4.5a2.5 2.5 0 11.702 4.283l-4.12 2.354a2.51 2.51 0 010 .726l4.12 2.354A2.5 2.5 0 1113 15.5a2.5 2.5 0 01-.702-4.283l-4.12-2.354a2.51 2.51 0 010-.726l4.12-2.354A2.5 2.5 0 0113 4.5zM4.5 10a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM15.5 10a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" /></svg>
                        {t('badgeDetailModal.shareButton', 'Share')}
                    </a>
                </div>
            </div>
        </div>
    );
};

export default BadgeDetailModal;