// src/components/PredictionModal.js

import React, { useState } from 'react';
import PredictionWidget from './PredictionWidget';
import InfoModal from './InfoModal';
import ConfirmationModal from './ConfirmationModal'; // Import the modal

const PredictionModal = ({ isOpen, onClose, initialStock }) => {
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    // 1. Add state to manage the confirmation modal
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
            <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
            
            {/* 2. Render the ConfirmationModal with its state and handlers */}
            <ConfirmationModal
                isOpen={confirmation.isOpen}
                onClose={handleCloseConfirmation}
                onConfirm={() => {
                    if (confirmation.onConfirm) {
                        confirmation.onConfirm();
                    }
                    handleCloseConfirmation();
                }}
                title="Are you sure?"
                message={confirmation.message}
            />

            <div 
                className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-start pt-20 sm:items-center z-40 animate-fade-in-fast"
                onClick={onClose}
            >
                <div 
                    className="relative bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl w-11/12 max-w-md"
                    onClick={e => e.stopPropagation()}
                >
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                    
                    {/* 3. Pass a function down to the widget to let it request a confirmation */}
                    <PredictionWidget 
                        onClose={onClose} 
                        initialStock={initialStock} 
                        onInfoClick={() => setIsInfoModalOpen(true)} 
                        requestConfirmation={(message, onConfirm) => setConfirmation({ isOpen: true, message, onConfirm })}
                    />
                </div>
            </div>
        </>
    );
};

export default PredictionModal;