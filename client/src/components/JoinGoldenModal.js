import React, { useState } from 'react';
import ReactDOM from 'react-dom'; // Portal for robust stacking
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const JoinGoldenModal = ({ isOpen, onClose, goldenMember, onUpdate }) => {
    const { t } = useTranslation();
    const [isSuccess, setIsSuccess] = useState(false);

    // If the modal is not open or the required data is missing, render nothing.
    if (!isOpen || !goldenMember) {
        return null;
    }

    const handleJoin = () => {
        axios.post(`${process.env.REACT_APP_API_URL}/api/users/${goldenMember._id}/join-golden`, {}, { withCredentials: true })
            .then(() => {
                // On success, show the success UI
                setIsSuccess(true);
            })
            .catch(() => {
                toast.error(t('joinGoldenModal.toast.error'));
            });
    };

    // This function is called from the success screen button
    const handleCloseOnSuccess = () => {
        onUpdate(); // This updates the parent page's state
        setIsSuccess(false); // Reset for the next time the modal opens
    };

    const modalContent = (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[100] animate-fade-in-fast" onClick={onClose}>
            <div className="relative bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg text-gray-300" onClick={e => e.stopPropagation()}>

                {isSuccess ? (
                    // --- SUCCESS VIEW ---
                    <div className="text-center animate-fade-in">
                        <div className="text-5xl mb-4">✅</div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            Subscription Successful!
                        </h2>
                        <p className="text-gray-400 mb-6">
                            You now have access to {goldenMember.username}'s exclusive feed.
                        </p>
                        <button
                            onClick={handleCloseOnSuccess}
                            className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-md hover:bg-green-600"
                        >
                            Awesome!
                        </button>
                    </div>
                ) : (
                    // --- INITIAL JOIN VIEW ---
                    <>
                        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12"></path>
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
                        </div>

                        {/* Member's Description */}
                        <div className="bg-gray-700 p-4 rounded-lg mb-6">
                            <p className="font-bold text-white mb-2">{t('joinGoldenModal.whatYouGet')}</p>
                            <p className="text-sm">
                                {goldenMember.goldenMemberDescription || t('joinGoldenModal.noDescription')}
                            </p>
                        </div>

                        {/* Main Call-to-Action Button */}
                        <button
                            onClick={handleJoin}
                            className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-md hover:bg-green-600 transition-colors mt-6"
                        >
                            {t('joinGoldenModal.joinButtonWithPrice', { price: goldenMember.goldenMemberPrice })}
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
                            <span>You can cancel anytime.</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    // Teleport the modal to the document body to avoid z-index issues
    return ReactDOM.createPortal(modalContent, document.body);
};

export default JoinGoldenModal;