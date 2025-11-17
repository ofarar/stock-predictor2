// src/components/TimePenaltyBar.js

import React from 'react';
import { useTranslation } from 'react-i18next';

const TimePenaltyBar = ({ message, barWidth, onInfoClick }) => {
    const { t } = useTranslation();
    return (
        <div className="mb-4">
            <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                <div className="flex items-center gap-2">
                    <span>{t('timePenaltyBar.label')}</span>
                    <button 
                        type="button" 
                        onClick={onInfoClick} 
                        className="w-4 h-4 flex items-center justify-center bg-gray-600 text-gray-300 rounded-full text-xs font-bold hover:bg-gray-500"
                        aria-label={t('timePenaltyBar.infoAriaLabel')}
                    >
                        ?
                    </button>
                </div>
                <span className="font-bold text-white">{message}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                    className="bg-green-500 h-2.5 rounded-full" 
                    style={{ width: barWidth, transition: 'width 0.5s ease-in-out' }}
                ></div>
            </div>
        </div>
    );
};

export default TimePenaltyBar;