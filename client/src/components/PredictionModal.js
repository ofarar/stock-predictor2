import React from 'react';
import PredictionWidget from './PredictionWidget';

const PredictionModal = ({ isOpen, onClose, initialStock }) => {
    if (!isOpen) return null;

    return (
        // Modal backdrop
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-start pt-20 sm:items-center z-50 animate-fade-in-fast"
            onClick={onClose} // Close modal when clicking the background
        >
            {/* Modal content container */}
            <div 
                className="relative bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl w-11/12 max-w-md"
                onClick={e => e.stopPropagation()} // Prevent clicks inside the modal from closing it
            >
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <PredictionWidget onClose={onClose} initialStock={initialStock} />
            </div>
        </div>
    );
};

export default PredictionModal;