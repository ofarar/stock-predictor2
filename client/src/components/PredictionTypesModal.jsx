// src/components/PredictionTypesModal.js

import React from 'react';
import { useTranslation } from 'react-i18next';

const predictionTypes = [
    { name: 'Hourly', titleKey: 'predictionTypes.hourly', descriptionKey: 'predictionTypes.hourlyDescription' },
    { name: 'Daily', titleKey: 'predictionTypes.daily', descriptionKey: 'predictionTypes.dailyDescription' },
    { name: 'Weekly', titleKey: 'predictionTypes.weekly', descriptionKey: 'predictionTypes.weeklyDescription' },
    { name: 'Monthly', titleKey: 'predictionTypes.monthly', descriptionKey: 'predictionTypes.monthlyDescription' },
    { name: 'Quarterly', titleKey: 'predictionTypes.quarterly', descriptionKey: 'predictionTypes.quarterlyDescription' },
    { name: 'Yearly', titleKey: 'predictionTypes.yearly', descriptionKey: 'predictionTypes.yearlyDescription' },
];

const PredictionTypesModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{t('predictionTypes.modalTitle')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                {/* Scrollable Content Area */}
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pe-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {predictionTypes.map(pt => (
                        <div key={pt.name} className="bg-gray-700 p-3 rounded-md">
                            <h3 className="font-bold text-green-400">{t(pt.titleKey)}</h3>
                            <p className="text-sm text-gray-300">{t(pt.descriptionKey)}</p>
                        </div>
                    ))}
                </div>

                {/* Standardized Bottom Button */}
                <div className="flex justify-end mt-6 pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700">
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PredictionTypesModal;