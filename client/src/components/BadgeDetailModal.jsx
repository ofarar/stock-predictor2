// src/components/BadgeDetailModal.js

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import ShareModal from './ShareModal'; // <-- 1. Import new component
import useLockBodyScroll from '../hooks/useLockBodyScroll';
import { getShareBaseUrl } from '../utils/urlHelper'; // <--- Import helper
import { FaShareAlt } from 'react-icons/fa';

const badgeStyles = {
    Bronze: { color: 'text-yellow-600', icon: '🥉' },
    Silver: { color: 'text-gray-400', icon: '🥈' },
    Gold: { color: 'text-yellow-400', icon: '🥇' },
};

const BadgeDetailModal = ({ badge, onClose }) => {
    // Only lock scroll if this modal is effectively open.
    // NOTE: This modal doesn't have an `isOpen` prop, it's conditionally rendered by parent.
    // However, when it IS rendered, we want to lock scroll.
    // We can pass `true` or check if `badge` exists.
    useLockBodyScroll(!!badge);
    const { t } = useTranslation();

    // --- 3. Add state for the new modal ---
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    if (!badge) return null;

    const style = badgeStyles[badge.tier] || { color: 'text-gray-500', icon: '⚫' };

    // --- 4. Prepare data for the ShareModal ---
    const baseUrl = getShareBaseUrl();
    const relativePath = window.location.pathname + window.location.search;
    const url = `${baseUrl}${relativePath}`;
    const icon = badgeStyles[badge.tier]?.icon || '🏆';
    // Use the *new* translation key
    const shareText = t('badgeDetailModal.shareTweet', {
        tier: t(`badges.tiers.${badge.tier}`, badge.tier),
        name: badge.name,
        icon: icon
    });

    return (
        <>
            {/* --- 5. Render the ShareModal (it's invisible until opened) --- */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                title={t('badgeDetailModal.shareTitle', 'Share Badge')}
                text={shareText}
                url={url}
                shareContext={{ context: 'badge', name: badge.name }}
            />

            {ReactDOM.createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
                    <div className="bg-gray-800 p-8 rounded-lg w-full max-w-sm text-center relative" onClick={e => e.stopPropagation()}>
                        <button onClick={onClose} className="absolute top-3 end-3 text-gray-400 hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                        <span className={`text-7xl ${style.color}`}>{style.icon}</span>
                        <h2 className="text-2xl font-bold text-white mt-4">{badge.name}</h2>
                        <p className={`font-semibold ${style.color}`}>{t(`badges.tiers.${badge.tier}`, `${badge.tier} Tier`)}</p>
                        <p className="text-gray-400 mt-2 text-sm">{badge.description}</p>

                        {/* --- 6. UPDATED BUTTONS FOOTER --- */}
                        <div className="flex justify-center gap-4 mt-8 pt-4 border-t border-gray-700">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700"
                            >
                                {t('common.close')}
                            </button>

                            {/* --- This button now opens the ShareModal --- */}
                            <button
                                type="button"
                                onClick={() => setIsShareModalOpen(true)}
                                className="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 text-center flex items-center justify-center gap-2"
                            >
                                <FaShareAlt className="w-4 h-4" />
                                {t('badgeDetailModal.shareButton', 'Share')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default BadgeDetailModal;