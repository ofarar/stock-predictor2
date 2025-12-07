import React from 'react';
import { useTranslation } from 'react-i18next';
import { generateSmartSummary } from '../utils/summaryGenerator';

const SmartSummaryModal = ({ isOpen, onClose, user, performance, predictions }) => {
    const { t } = useTranslation();

    if (!isOpen || !user) return null;

    const summary = generateSmartSummary(user, performance, predictions, t);
    const shareUrl = window.location.href; // Profile URL
    const summaryText = Array.isArray(summary) ? summary.map(s => `• ${s}`).join('\n') : summary;
    const shareText = `${t('share_message_intro', 'Check out this trader profile on StockPredictor!')}\n\n${summaryText}`;

    const handleShareX = () => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank');
    };

    const handleShareTelegram = () => {
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        window.open(telegramUrl, '_blank');
    };

    return (
        <div data-testid="smart-summary-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm animate-fade-in mx-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-2xl border border-gray-700 relative flex flex-col max-h-[90vh] overflow-y-auto">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full filter blur-3xl opacity-10 transform translate-x-10 -translate-y-10"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500 rounded-full filter blur-3xl opacity-10 transform -translate-x-10 translate-y-10"></div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg bg-opacity-20">
                        {/* Replaced Icon with the same Emoji-style visual if preferred, or just a nicer looking star icon */}
                        <span className="text-2xl" role="img" aria-label="sparkles">✨</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-wide">
                        {t('smart_summary_title', 'Smart Summary')}
                    </h2>
                </div>

                {/* Summary Content */}
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700/50 mb-8 backdrop-blur-sm">
                    <ul className="text-lg text-gray-200 leading-relaxed font-medium list-disc list-inside space-y-2">
                        {Array.isArray(summary) ? (
                            summary.map((item, index) => (
                                <li key={index}>{item}</li>
                            ))
                        ) : (
                            <li>{summary}</li>
                        )}
                    </ul>
                </div>

                {/* Share Actions */}
                <div className="space-y-3">
                    <p className="text-sm text-gray-400 font-medium uppercase tracking-wider mb-2">
                        {t('share_summary_label', 'Share this summary')}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={handleShareX}
                            className="flex items-center justify-center gap-2 bg-black hover:bg-gray-900 text-white py-3 px-4 rounded-lg font-bold transition-all transform hover:scale-[1.02] border border-gray-800"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                            <span>X</span>
                        </button>
                        <button
                            onClick={handleShareTelegram}
                            className="flex items-center justify-center gap-2 bg-[#0088cc] hover:bg-[#007dbb] text-white py-3 px-4 rounded-lg font-bold transition-all transform hover:scale-[1.02]"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z" /></svg>
                            <span>Telegram</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartSummaryModal;
