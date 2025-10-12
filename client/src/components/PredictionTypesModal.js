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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white mb-6">{t('predictionTypes.modalTitle')}</h2>
                <div className="space-y-4">
                    {predictionTypes.map(pt => (
                        <div key={pt.name} className="bg-gray-700 p-3 rounded-md">
                            <h3 className="font-bold text-green-400">{t(pt.titleKey)}</h3>
                            <p className="text-sm text-gray-300">{t(pt.descriptionKey)}</p>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end mt-6">
                    <button onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700">
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PredictionTypesModal;
