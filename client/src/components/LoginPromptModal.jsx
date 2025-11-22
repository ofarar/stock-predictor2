import React from 'react';
import { useTranslation } from 'react-i18next';

const LoginPromptModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();

    const getLoginUrl = () => {
        const refCode = localStorage.getItem('referralCode');
        let url = `${import.meta.env.VITE_API_URL}/auth/google?redirect=${window.location.pathname}`;
        if (refCode) {
            url += `&ref=${refCode}`;
        }
        return url;
    };
    // --- END NEW ---

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
            <div className="relative bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm text-center">
                <button onClick={onClose} className="absolute top-4 end-4 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-4">{t('loginPromptModal.title')}</h2>
                <p className="text-gray-300 mb-6">{t('loginPromptModal.description')}</p>
                <a
                    href={getLoginUrl()}
                    className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center space-x-3 hover:bg-blue-700 transition"
                >
                    <span>{t('loginPromptModal.signUpWithGoogle')}</span>
                </a>
            </div>
        </div>
    );
};

export default LoginPromptModal;
