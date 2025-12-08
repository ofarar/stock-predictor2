// src/components/VerificationModal.js
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils/formatters';
import axios from 'axios';
import toast from 'react-hot-toast';

const VerificationModal = ({ isOpen, onClose, price, onUpdate }) => {
    const { t, i18n } = useTranslation();
    const [view, setView] = useState('initial');
    // *** ADD isProcessing STATE ***
    const [isProcessing, setIsProcessing] = useState(false);

    const handleGetVerifiedClick = async () => {
        // *** SET isProcessing TO true ***
        setIsProcessing(true);
        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/stripe/create-checkout-session`,
                {},
                { withCredentials: true }
            );

            const { url } = response.data;

            if (!url) {
                toast.error("Checkout URL missing.");
                setIsProcessing(false); // *** RESET on error ***
                return;
            }
            // Redirect happens here, no need to reset isProcessing on success
            window.location.href = url;
        } catch (error) {
            console.error("Stripe initiation error:", error);
            toast.error("Could not initiate payment. Please try again.");
            // *** RESET isProcessing on error ***
            setIsProcessing(false);
        }
    };

    // Renamed for clarity, handles modal close regardless of view
    const handleClose = () => {
        if (view === 'success' && onUpdate) {
            onUpdate(); // Call update if we were on the success screen
        }
        setView('initial'); // Reset view state
        setIsProcessing(false); // Reset processing state
        onClose(); // Call the original onClose prop
    };

    const handleCloseAndRefresh = () => {
        if (onUpdate) { // Only call onUpdate if it exists
            onUpdate();
        }
        onClose();
    };


    if (!isOpen) return null;

    return createPortal(
        // *** Use handleClose for the backdrop click ***
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={handleClose}>
            <div className="relative bg-gray-800 p-8 rounded-lg w-full max-w-md text-center" onClick={(e) => e.stopPropagation()}>
                {/* *** ADD CLOSE BUTTON ('X') *** */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 end-4 text-gray-400 hover:text-white"
                    aria-label="Close modal"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>

                {view === 'initial' && (
                    <>
                        <h2 className="text-2xl font-bold text-white mb-4">{t('verificationModal.title')}</h2>
                        <p className="text-gray-300 mb-6">{t('verificationModal.description')}</p>
                        <ul className="text-start space-y-2 mb-8 text-gray-300 text-sm list-disc list-inside">
                            {/* Added example benefits using translation keys */}
                            <li>{t('verificationModal.benefits.greenCheck')}</li>
                            <li>{t('verificationModal.benefits.verifiedFilter')}</li>
                            <li>{t('verificationModal.benefits.verifiedExpert')}</li>
                        </ul>
                        <button
                            onClick={handleGetVerifiedClick}
                            // *** DISABLE BUTTON WHEN PROCESSING ***
                            disabled={isProcessing}
                            className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {/* Show different text when processing */}
                            {isProcessing ? t('processing_verification_msg') : t('verificationModal.button', { price: formatCurrency(parseFloat(price), i18n.language, 'USD') })}
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
        </div>,
        document.body
    );
};

export default VerificationModal;