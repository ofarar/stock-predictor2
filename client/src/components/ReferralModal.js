// src/components/ReferralModal.js
import React from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const ReferralModal = ({ isOpen, onClose, userId }) => {
    const { t } = useTranslation();
    const appUrl = window.location.origin; // e.g., "http://localhost:3000" or "https://predictostock.vercel.app"
    const referralLink = `${appUrl}/?ref=${userId}`;

    if (!isOpen) return null;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralLink);
        toast.success(t('referralModal.copied', 'Link copied to clipboard!'));
    };

    const shareOnX = () => {
        const text = t('referralModal.shareTweet');
        const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    // --- NEW TELEGRAM SHARE FUNCTION ---
    const shareOnTelegram = () => {
        const text = t('referralModal.shareTelegram'); // Using a new key for flexibility
        const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{t('referralModal.title', 'Invite & Earn')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <p className="text-gray-300 mb-4">
                    {t('referralModal.description', 'Invite friends to StockPredictor. When they sign up, you’ll earn 500 Analyst Rating points!')}
                </p>

                <div className="bg-gray-900 p-3 rounded-md flex items-center gap-2">
                    <input
                        type="text"
                        value={referralLink}
                        readOnly
                        className="bg-transparent text-gray-400 w-full outline-none"
                    />
                    <button
                        onClick={copyToClipboard}
                        className="bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600"
                    >
                        {t('referralModal.copy', 'Copy')}
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-6">
                    <button
                        onClick={shareOnX}
                        className="bg-[#1DA1F2] text-white font-bold py-2 px-6 rounded-lg hover:bg-[#0c85d0] flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                        {t('referralModal.share', 'Share on X')}
                    </button>
                    {/* --- NEW TELEGRAM BUTTON --- */}
                    <button
                        onClick={shareOnTelegram}
                        className="bg-[#0088cc] text-white font-bold py-2 px-6 rounded-lg hover:bg-[#0077b3] flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472c-.18 1.898-.962 6.502-1.36 8.627c-.168.9-.499 1.201-.82 1.23a1.566 1.566 0 0 1-1.14-.517c-.291-.286-.539-.553-.807-.811c-.44-.423-.811-.776-1.353-.74c-.585.038-.974.24-1.37.51c-.43.29-.78.43-.975.38c-.21 0-.603-.13-1.01-1.213c-.434-.962-.89-3.045-.89-3.045s-.014-.121.033-.176a.23.23 0 0 1 .193-.07c.07.005.151.015.223.03c.693.13 1.217.265 1.77.42c.57.16 1.152.33 1.352.42c.005.002.01.004.012.004a.43.43 0 0 0 .426-.003c.123-.04.167-.17.18-.28c.01-.06.01-.11.005-.15s-.01-.07-.01-.07l-.005-.01l-.21-.82c-.375-1.428-.883-2.82-1.04-3.323c-.156-.497-.31-.69-.45-.7c-.13-.01-.27.02-.39.06c-.16.05-.3.1-.41.16c-.18.09-.34.17-.48.24l-.004.002s-.11.05-.14.07c-.03.02-.05.03-.06.04c-.01.01-.01.01 0 0c-.01.01-.01.01 0 0c-.01 0-.01.01-.01.01c0 0 0 0 0 0c0 0 0 0 0 0c0 0 0 0 0 0c0 0 0 0 0 0c0 0 0 0 0 0c-.01 0 0 .01-.01.01s0 0 0 0c0 0 0 0 0 0c-.01 0-.01.01 0 .01s-.01.01 0 .01c0 .01.01.01.01.02c.01.01.03.02.04.03c.01.01.04.02.06.03c.03.01.06.02.08.03c.02.01.05.02.06.02c.02.01.03.01.04.01c.01 0 .02.01.02.01c.01 0 .01.01.01.01c.01 0 .01.01.01.01c.01 0 .01.01.01.01c.01 0 .01.01.01.01c.01 0 .01 0 .01.01c.01 0 .01 0 .01.01c.01 0 .01 0 .01.01c0 0 .01 0 .01.01c0 0 .01 0 .01.01c0 0 .01 0 .01.01c0 0 .01 0 .01.01c0 0 .01 0 .01.01c0 0 .01 0 .01.01c0 0 .01 0 .01.01c0 0 0 0 0 0c0 0 0 0 0 0c-.09.05-.19.1-.28.16c-.04.03-.1.06-.15.09c-.1.06-.18.11-.27.16c-.01 0-.01.01-.02.01c-.01 0-.01.01-.02.01c-.11.06-.22.12-.33.17c-.11.06-.23.1-.35.15c-.24.09-.5.16-.76.16c-.25.01-.5-.06-.73-.2a.97.97 0 0 1-.51-.48c-.01-.02-.02-.04-.02-.05c-.01-.02-.02-.04-.02-.06c-.01-.02-.01-.04-.02-.05c0-.02 0-.03-.01-.05l-2.07-8.067c-.01-.03-.01-.06-.01-.08c-.01-.1-.01-.2 0-.3c.01-.1.02-.2.04-.3a.5.5 0 0 1 .1-.26.5.5 0 0 1 .28-.19c.1-.04.2-.06.3-.07c.04-.01.08-.01.12-.01z" /></svg>
                        {t('referralModal.shareOnTelegram', 'Share on Telegram')}
                    </button>
                </div>

                <div className="flex justify-end mt-8 pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700">
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReferralModal;