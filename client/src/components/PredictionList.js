// src/components/PredictionList.js
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MiniPredictionCard from './MiniPredictionCard';

const PredictionList = ({ titleKey, predictions, quotes, isOwnProfile, onEditClick, emptyTextKey }) => {
    const { t } = useTranslation();
    const [visibleCount, setVisibleCount] = useState(6);

    return (
        <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-4">{t(titleKey)}</h3>
            {predictions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                    {predictions.slice(0, visibleCount).map(p => (
                        <MiniPredictionCard
                            key={p._id}
                            prediction={p}
                            currentPrice={quotes ? quotes[p.stockTicker] : undefined}
                            isOwnProfile={isOwnProfile}
                            onEditClick={onEditClick}
                        />
                    ))}
                </div>
            ) : <p className="text-gray-500 text-center py-4">{t(emptyTextKey)}</p>}
            {predictions.length > visibleCount && (
                <button onClick={() => setVisibleCount(prev => prev + 6)} className="w-full mt-4 bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600">
                    {t('load_more_label')}
                </button>
            )}
        </div>
    );
};

export default PredictionList;