// src/components/InfoModal.js

import React from 'react';
import { useTranslation } from 'react-i18next';

const InfoModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="relative bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-lg text-gray-300" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{t('infoModal.title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
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

                <div className="flex justify-end mt-6 pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700">
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InfoModal;