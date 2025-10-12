// src/components/VerifiedStatusModal.js

import React from 'react';
import { useTranslation } from 'react-i18next';

const VerifiedStatusModal = ({ isOpen, onClose, onCancel }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 p-8 rounded-lg w-full max-w-md text-center"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-white mb-2">
                    {t('verifiedStatusModal.title')}
                </h2>
                <p className="text-gray-400 mb-6">
                    {t('verifiedStatusModal.description')}
                </p>
                <div className="flex flex-col gap-4">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700"
                    >
                        {t('verifiedStatusModal.closeButton')}
                    </button>
                    <button
                        onClick={onCancel}
                        className="text-sm text-red-500 hover:underline"
                    >
                        {t('verifiedStatusModal.removeButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerifiedStatusModal;
