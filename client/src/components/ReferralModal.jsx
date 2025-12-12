// src/components/ReferralModal.js
import React from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

import { getShareBaseUrl } from '../utils/urlHelper'; // <--- Import
import useLockBodyScroll from '../hooks/useLockBodyScroll';

const ReferralModal = ({ isOpen, onClose, userId }) => {
    useLockBodyScroll(isOpen);
    const { t } = useTranslation();
    const appUrl = getShareBaseUrl(); // <--- Use helper
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

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{t('referralModal.title', 'Invite & Earn')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <p className="text-gray-300 mb-4">
                    {t('referralModal.description', 'Invite friends to StockPredictorAI. When they sign up, you’ll earn 500 Analyst Rating points!')}
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
                        className="bg-[#1DA1F2] text-white font-bold py-2 px-6 rounded-lg hover:bg-[#0c85d0] flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                        {t('referralModal.share', 'Share on X')}
                    </button>
                    {/* --- NEW TELEGRAM BUTTON --- */}
                    <button
                        onClick={shareOnTelegram}
                        className="bg-[#0088cc] text-white font-bold py-2 px-6 rounded-lg hover:bg-[#0077b3] flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z" /></svg>
                        {t('referralModal.shareOnTelegram', 'Share on Telegram')}
                    </button>
                </div>

                <div className="flex justify-end mt-8 pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700">
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ReferralModal;