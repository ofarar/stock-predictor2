// src/components/PredictionModal.js

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PredictionWidget from './PredictionWidget';
import InfoModal from './InfoModal';
import ConfirmationModal from './ConfirmationModal';
import PredictionTypesModal from './PredictionTypesModal';

const PredictionModal = ({ isOpen, onClose, initialStock }) => {
    const { t } = useTranslation();

    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [isTypesModalOpen, setIsTypesModalOpen] = useState(false);

    // State to manage confirmation modal
    const [confirmation, setConfirmation] = useState({
        isOpen: false,
        message: '',
        onConfirm: null
    });

    if (!isOpen) return null;

    const handleCloseConfirmation = () => {
        setConfirmation({ isOpen: false, message: '', onConfirm: null });
    };

    return (
        <>
            {/* Info & Types modals */}
            <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
            <PredictionTypesModal isOpen={isTypesModalOpen} onClose={() => setIsTypesModalOpen(false)} />

            {/* Confirmation modal */}
            <ConfirmationModal
                isOpen={confirmation.isOpen}
                onClose={handleCloseConfirmation}
                onConfirm={() => {
                    if (confirmation.onConfirm) confirmation.onConfirm();
                    handleCloseConfirmation();
                }}
                title={t('predictionModal.confirmationTitle')}
                message={confirmation.message}
            />

            <div
                className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-start pt-20 sm:items-center z-40 animate-fade-in-fast"
                onClick={onClose}
            >
                <div
                    id="prediction-modal"
                    role="dialog"
                    aria-modal="true"
                    className="relative bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl w-11/12 max-w-md"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        aria-label={t('predictionModal.closeButtonAria')}
                        className="absolute top-4 end-4 text-gray-400 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>

                    {/* Prediction widget */}
                    <PredictionWidget
                        onClose={onClose}
                        initialStock={initialStock}
                        onInfoClick={() => setIsInfoModalOpen(true)}
                        onTypesInfoClick={() => setIsTypesModalOpen(true)}
                        requestConfirmation={(message, onConfirm) =>
                            setConfirmation({ isOpen: true, message, onConfirm })
                        }
                    />
                </div>
            </div>
        </>
    );
};

export default PredictionModal;
