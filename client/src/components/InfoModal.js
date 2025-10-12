// src/components/InfoModal.js

import React from 'react';
import { useTranslation } from 'react-i18next';

const InfoModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        // FIX: z-index ensures this modal appears above PredictionModal
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
            <div className="relative bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg text-gray-300">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-4">{t('infoModal.title')}</h2>
                <div className="space-y-4 text-sm">
                    <p>{t('infoModal.description')}</p>
                    
                    <div>
                        <h3 className="font-bold text-white">{t('infoModal.hourlyPredictions.title')}</h3>
                        <p>{t('infoModal.hourlyPredictions.description')}</p>
                    </div>

                    <div>
                        <h3 className="font-bold text-white">{t('infoModal.dailyPredictions.title')}</h3>
                        <p>{t('infoModal.dailyPredictions.description')}</p>
                    </div>

                    <div>
                        <h3 className="font-bold text-white">{t('infoModal.longerTermPredictions.title')}</h3>
                        <p>{t('infoModal.longerTermPredictions.description')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InfoModal;
