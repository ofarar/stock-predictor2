// src/components/VerificationModal.js

import React from 'react';
import { useTranslation } from 'react-i18next';

const VerificationModal = ({ isOpen, onClose, onConfirm, price }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 p-8 rounded-lg w-full max-w-md text-center"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold text-white mb-4">
                    {t('verificationModal.title')}
                </h2>
                <p className="text-gray-300 mb-6">
                    {t('verificationModal.description')}
                </p>

                <ul className="text-left space-y-3 mb-8 text-gray-300">
                    <li className="flex items-center gap-3">
                        <span className="text-green-400">✓</span>
                        <span>{t('verificationModal.benefits.greenCheck')}</span>
                    </li>
                    <li className="flex items-center gap-3">
                        <span className="text-green-400">✓</span>
                        <span>{t('verificationModal.benefits.verifiedFilter')}</span>
                    </li>
                    <li className="flex items-center gap-3">
                        <span className="text-green-400">✓</span>
                        <span>{t('verificationModal.benefits.verifiedExpert')}</span>
                    </li>
                </ul>

                <button
                    onClick={onConfirm}
                    className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-600"
                >
                    {t('verificationModal.button', { price })}
                </button>
            </div>
        </div>
    );
};

export default VerificationModal;
