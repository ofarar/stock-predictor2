import React from 'react';
import { useTranslation } from 'react-i18next';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 animate-fade-in-fast"
            onClick={onClose}
        >
            <div 
                className="relative bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm text-center"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold text-white mb-4">{title || t('confirmationModal.defaultTitle')}</h2>
                <p className="text-gray-300 mb-8">{message || t('confirmationModal.defaultMessage')}</p>
                
                <div className="flex justify-center gap-4">
                    <button 
                        onClick={onClose} 
                        className="w-full bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition"
                    >
                        {t('confirmationModal.cancel')}
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition"
                    >
                        {t('confirmationModal.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
