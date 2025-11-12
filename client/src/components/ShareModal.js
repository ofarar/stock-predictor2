// src/components/ShareModal.js
import React from 'react';
import { useTranslation } from 'react-i18next';
import ReactDOM from 'react-dom';

const ShareModal = ({ isOpen, onClose, title, text, url }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    // Build the share URLs.
    // X (Twitter) handles text and URL separately.
    const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    
    // Telegram combines the text and URL.
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100] p-4 animate-fade-in-fast" 
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 p-6 rounded-lg w-full max-w-sm" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">
                        {title || t('shareModal.title')}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Vertical stack of share buttons */}
                <div className="flex flex-col gap-4">
                    {/* X (Twitter) Button */}
                    <a
                        href={xUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 w-full bg-gray-900 text-white font-bold py-3 px-5 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        {/* X (Twitter) SVG Icon */}
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        {t('shareModal.shareOnX')}
                    </a>
                    
                    {/* Real Telegram Button (Flying Paper Icon) */}
                    <a
                        href={telegramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 w-full bg-blue-500 text-white font-bold py-3 px-5 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        {/* Telegram "Flying Paper" SVG Icon */}
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                           <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009.176 16.5l-3.328-1.026 5.99-2.825.002.002.002.002a1 1 0 00.86-.098l3-2a1 1 0 000-1.8l-3-2a1 1 0 00-.86-.098l-.002.002-.002.002-5.99-2.825L9.176 3.5a1 1 0 00.707-1.028l-5-1.429a1 1 0 00-1.17 1.41l7 14zM16 10a1 1 0 10-2 0 1 1 0 002 0z" />
                        </svg>
                        {t('shareModal.shareOnTelegram')}
                    </a>
                </div>
            </div>
        </div>
    );

    // Use a Portal to render the modal at the top level
    return ReactDOM.createPortal(modalContent, document.body);
};

export default ShareModal;