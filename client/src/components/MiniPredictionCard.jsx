// src/components/MiniPredictionCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { FaTrash } from 'react-icons/fa';

const MiniPredictionCard = ({ prediction, currentPrice, isOwnProfile, onEditClick, isAdmin, onDeleteClick }) => {
    const { t, i18n } = useTranslation();
    const isAssessed = prediction.status === 'Assessed';
    let percentageChange = null;
    if (!isAssessed && currentPrice > 0) {
        percentageChange = ((prediction.targetPrice - currentPrice) / currentPrice) * 100;
    }

    const hasEdit = isOwnProfile && prediction.status === 'Active';
    const hasDelete = isAdmin;
    const paddingClass = (hasEdit && hasDelete) ? 'pe-20' : (hasEdit || hasDelete) ? 'pe-12' : 'pe-4';

    return (
        <div className="relative">
            <Link to={`/prediction/${prediction._id}`} className={`block bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition-colors ${paddingClass}`}>
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="font-bold text-white text-lg">{prediction.stockTicker}</span>
                        <span className="text-xs text-gray-400">
                            {t(`predictionTypes.${prediction.predictionType.toLowerCase()}`)}
                        </span>
                    </div>
                    {isAssessed ? (
                        <div className="text-end">
                            <p className={`font-bold text-xl ${prediction.rating > 60 ? 'text-green-400' : 'text-red-400'}`}>{prediction.rating.toFixed(1)}</p>
                            <p className="text-xs text-gray-500 -mt-1">{t('common.rating')}</p>
                        </div>
                    ) : (
                        <div className="text-end">
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
            {hasEdit && (
                <button
                    onClick={(e) => { e.stopPropagation(); onEditClick(prediction); }}
                    className={`absolute top-1/2 -translate-y-1/2 p-1 bg-gray-800 rounded-full text-gray-400 hover:text-white ${hasDelete ? 'end-10' : 'end-2'}`}
                    title="Edit Prediction"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536l10.732-10.732z"></path></svg>
                </button>
            )}
            {hasDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDeleteClick(prediction._id); }}
                    className="absolute top-1/2 end-2 -translate-y-1/2 p-1 bg-gray-800 rounded-full text-gray-400 hover:text-red-500"
                    title="Delete Prediction (Admin)"
                >
                    <FaTrash className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default MiniPredictionCard;