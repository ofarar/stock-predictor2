// src/components/JoinGoldenModal.js
import React, { useState } from 'react';
import ReactDOM from 'react-dom'; // Portal for robust stacking
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const JoinGoldenModal = ({ isOpen, onClose, goldenMember }) => {
    const { t } = useTranslation();
    const [isProcessing, setIsProcessing] = useState(false); // State to disable button during API call

    // If the modal is not open or the required goldenMember data is missing, render nothing.
    if (!isOpen || !goldenMember) {
        return null;
    }

    const handleJoin = async () => {
        // Prevent double clicks
        if (isProcessing) return;

        setIsProcessing(true); // Disable button
        try {
            // *** Make the API call to the specific backend route ***
            const response = await axios.post(
                // Use the goldenMember._id passed in via props
                `${process.env.REACT_APP_API_URL}/api/stripe/subscribe-to-member/${goldenMember._id}`,
                {}, // Empty body for POST request
                { withCredentials: true } // Send session cookies
            );

            // Expecting { url: sessionUrl } from the backend
            if (response.data.url) {
                // Redirect user to Stripe Checkout page
                window.location.href = response.data.url;
                // No need to set success state here, redirect handles it.
                // Button remains disabled as page changes.
            } else {
                // Should not happen if backend is correct, but handle defensively
                throw new Error("Checkout URL missing from response.");
            }
        } catch (err) {
            // Display error from backend if available, otherwise generic message
            toast.error(err.response?.data?.message || t('joinGoldenModal.toast.error'));
            setIsProcessing(false); // Re-enable button on error
        }
        // No finally block needed because success causes a redirect
    };

    const modalContent = (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100] animate-fade-in-fast" onClick={onClose}>
            <div className="relative bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg text-gray-300" onClick={e => e.stopPropagation()}>

                {/* --- INITIAL JOIN VIEW --- */}
                <>
                    <button onClick={onClose} disabled={isProcessing} className="absolute top-4 right-4 text-gray-400 hover:text-white disabled:opacity-50">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>

                    {/* Visual Header with Avatar */}
                    <div className="flex flex-col items-center text-center mb-4">
                        <img
                            src={goldenMember.avatar}
                            alt={goldenMember.username}
                            className="w-20 h-20 rounded-full border-4 border-yellow-400 mb-3"
                        />
                        <h2 className="text-2xl font-bold text-white">
                            {t('joinGoldenModal.title', { username: goldenMember.username })}
                        </h2>
                        <p className="text-yellow-400 font-semibold">
                            {t('joinGoldenModal.pricePerMonth', { price: `$${goldenMember.goldenMemberPrice.toFixed(2)}` })}
                        </p>
                    </div>

                    {/* Member's Description */}
                    <div className="bg-gray-700 p-4 rounded-lg mb-6 max-h-40 overflow-y-auto">
                        <p className="font-bold text-white mb-2">{t('joinGoldenModal.whatYouGet')}</p>
                        <p className="text-sm">
                            {goldenMember.goldenMemberDescription || t('joinGoldenModal.noDescription')}
                        </p>
                    </div>

                    {/* Main Call-to-Action Button */}
                    <button
                        onClick={handleJoin}
                        disabled={isProcessing} // Disable while processing
                        className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-md hover:bg-green-600 transition-colors mt-6 disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isProcessing ? t('joinGoldenModal.toast.processing', 'Processing...') : t('joinGoldenModal.joinButtonWithPrice', { price: goldenMember.goldenMemberPrice })}
                    </button>
                    <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-400">
                        <svg
                            className="w-4 h-4 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944A12.02 12.02 0 0012 22a12.02 12.02 0 009-1.056A11.955 11.955 0 0121 12c0-2.828-1.035-5.405-2.772-7.394"
                            />
                        </svg>
                        <span>{t('joinGoldenModal.cancelAnytime')}</span>
                    </div>
                </>
            </div>
        </div>
    );

    // Teleport the modal to the document body
    return ReactDOM.createPortal(modalContent, document.body);
};

export default JoinGoldenModal;