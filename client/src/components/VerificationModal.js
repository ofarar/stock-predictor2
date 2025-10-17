// src/components/VerificationModal.js
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils/formatters';
import axios from 'axios';
import toast from 'react-hot-toast';

const VerificationModal = ({ isOpen, onClose, price, onUpdate }) => {
    const { t, i18n } = useTranslation();
    const [view, setView] = useState('initial'); // 'initial', 'loading', 'success'

    const handleConfirm = async () => {
        setView('loading');
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/api/profile/verify`, {}, { withCredentials: true });
            setView('success');
        } catch (error) {
            toast.error(t('verification_failed_msg'));
            setView('initial'); // Go back to the initial view on error
        }
    };

    const handleCloseAndRefresh = () => {
        if (onUpdate) { // Only call onUpdate if it exists
            onUpdate();
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={handleCloseAndRefresh}>
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md text-center" onClick={(e) => e.stopPropagation()}>

                {view === 'initial' && (
                    <>
                        <h2 className="text-2xl font-bold text-white mb-4">{t('verificationModal.title')}</h2>
                        <p className="text-gray-300 mb-6">{t('verificationModal.description')}</p>
                        <ul className="text-left space-y-3 mb-8 text-gray-300">
                            {/* ... benefits list ... */}
                        </ul>
                        <button type="button" onClick={handleConfirm} className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-600">
                            {t('verificationModal.button', { price: formatCurrency(parseFloat(price), i18n.language, 'USD') })}
                        </button>
                    </>
                )}

                {view === 'loading' && (
                    <div className="text-center p-8">
                        <svg className="animate-spin h-10 w-10 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-4 text-white">{t('processing_verification_msg')}</p>
                    </div>
                )}

                {view === 'success' && (
                    <div className="animate-fade-in">
                        <div className="text-6xl mb-4">✅</div>
                        <h2 className="text-2xl font-bold text-white mb-2">{t('verification_success_msg')}</h2>
                        <p className="text-gray-400 mb-6">{t('verificationModal.successDescriptionGeneric')}</p>
                        <button type="button" onClick={handleCloseAndRefresh} className="w-full bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700">
                            {t('common.close')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerificationModal;