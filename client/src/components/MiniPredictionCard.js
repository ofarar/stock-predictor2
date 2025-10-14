// src/components/MiniPredictionCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatPercentage } from '../utils/formatters';

const MiniPredictionCard = ({ prediction, currentPrice, isOwnProfile, onEditClick }) => {
    const { t, i18n } = useTranslation();
    const isAssessed = prediction.status === 'Assessed';
    let percentageChange = null;
    if (!isAssessed && currentPrice > 0) {
        percentageChange = ((prediction.targetPrice - currentPrice) / currentPrice) * 100;
    }

    return (
        <div className="relative">
            <Link to={`/prediction/${prediction._id}`} className="block bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition-colors pr-8">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="font-bold text-white text-lg">{prediction.stockTicker}</span>
                        <span className="text-xs text-gray-400">
                            {t(`predictionTypes.${prediction.predictionType.toLowerCase()}`)}
                        </span>
                    </div>
                    {isAssessed ? (
                        <div className="text-right">
                            <p className={`font-bold text-xl ${prediction.score > 60 ? 'text-green-400' : 'text-red-400'}`}>{prediction.score.toFixed(1)}</p>
                            <p className="text-xs text-gray-500 -mt-1">{t('common.score')}</p>
                        </div>
                    ) : (
                        <div className="text-right">
                            <p className="font-semibold text-lg text-white">
                                {formatCurrency(prediction.targetPrice, i18n.language, prediction.currency)}
                            </p>
                            {percentageChange !== null && (
                                <p className={`text-sm font-bold -mt-1 ${percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatPercentage(percentageChange, i18n.language)}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </Link>
            {isOwnProfile && prediction.status === 'Active' && (
                <button
                    onClick={(e) => { e.stopPropagation(); onEditClick(prediction); }}
                    className="absolute top-1/2 right-1 -translate-y-1/2 p-1 bg-gray-800 rounded-full text-gray-400 hover:text-white"
                    title="Edit Prediction"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536l10.732-10.732z"></path></svg>
                </button>
            )}
        </div>
    );
};

export default MiniPredictionCard;