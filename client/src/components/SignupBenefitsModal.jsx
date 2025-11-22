// src/components/SignupBenefitsModal.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const BenefitItem = ({ icon, title, description }) => (
    <div className="flex items-start gap-4 bg-gray-700 p-4 rounded-lg">
        <div className="text-green-400 mt-1 flex-shrink-0">
            {icon}
        </div>
        <div>
            <h4 className="font-bold text-white text-lg">{title}</h4>
            <p className="text-sm text-gray-300">{description}</p>
        </div>
    </div>
);

const SignupBenefitsModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const loginUrl = `${import.meta.env.VITE_API_URL}/auth/google`;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-[100] p-4 animate-fade-in-fast" onClick={onClose}>
            <div className="relative bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 end-4 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>

                <h2 className="text-3xl font-bold text-white mb-2 text-center">{t('benefitsModal.title', 'Unlock the Full Experience')}</h2>
                <p className="text-gray-400 text-center mb-8">{t('benefitsModal.subtitle', 'Join the community to predict, track, and earn.')}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <BenefitItem
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>}
                        title={t('benefitsModal.predict.title', 'Make Predictions')}
                        description={t('benefitsModal.predict.desc', 'Build a transparent track record and prove your skills.')}
                    />
                    <BenefitItem
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>}
                        title={t('benefitsModal.notify.title', 'Smart Notifications')}
                        description={t('benefitsModal.notify.desc', 'Get alerts when your favorite analysts make a move.')}
                    />
                    <BenefitItem
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>}
                        title={t('benefitsModal.watchlist.title', 'Custom Watchlist')}
                        description={t('benefitsModal.watchlist.desc', 'Track specific stocks and see live community sentiment.')}
                    />
                    <BenefitItem
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0c-1.657 0-3-.895-3-2s1.343-2 3-2 3-.895 3-2-1.343-2-3-2m0 8c1.11 0 2.08-.402 2.599-1M12 16v1m0-1v-8"></path></svg>}
                        title={t('benefitsModal.earn.title', 'Earn Revenue')}
                        description={t('benefitsModal.earn.desc', 'Top performers share 50% of platform profits via the Creator Pool.')}
                    />
                </div>

                <div className="text-center">
                    <a
                        href={loginUrl}
                        className="inline-block w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-transform hover:scale-105"
                    >
                        {t('loginPromptModal.signUpWithGoogle', 'Sign Up with Google')}
                    </a>
                    <p className="mt-4 text-sm text-green-400 font-medium">
                        {t('benefitsModal.footer', 'It is 100% free to sign up. No credit card required.')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignupBenefitsModal;