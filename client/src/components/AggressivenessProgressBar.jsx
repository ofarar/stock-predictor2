// src/components/AggressivenessProgressBar.js
import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { formatPercentage } from '../utils/formatters';

const AggressivenessProgressBar = ({ data, analyzedCount, onInfoClick, className, alwaysVisible = false }) => {
    const { t, i18n } = useTranslation();
    const [showDetails, setShowDetails] = React.useState(false);

    // Logic: if alwaysVisible, just cursor-default. If not, cursor-pointer (on mobile) md:cursor-default (on desktop, previously).
    // Actually the previous logic was: cursor-pointer md:cursor-default.
    // So if alwaysVisible, we force cursor-default.
    const cursorClass = alwaysVisible ? "cursor-default" : "cursor-pointer md:cursor-default";

    const defaultClasses = `bg-gray-800 p-4 rounded-lg text-center col-span-2 md:col-span-4 ${cursorClass}`;
    const appliedClasses = className ? className : defaultClasses;

    if (!analyzedCount || analyzedCount === 0) {
        return (
            <div className={appliedClasses}>
                <p className="text-gray-400 text-sm font-medium">{t('aggressiveness.title')}</p>
                <p className="text-gray-500 text-xs mt-2">{t('aggressiveness.noData')}</p>
            </div>
        );
    }

    const { defensive, neutral, offensive } = data;
    const total = defensive + neutral + offensive;

    let score = 0;
    if (total > 0) {
        const weightedTotal = (neutral * 50) + (offensive * 100);
        score = weightedTotal / total;
    }

    const handleContainerClick = () => {
        if (alwaysVisible) return;
        setShowDetails(prev => !prev);
    };

    const isVisible = alwaysVisible || showDetails;

    return (
        <div className={appliedClasses} onClick={handleContainerClick}>
            <div className="flex flex-col md:flex-row justify-between items-center mb-2 gap-1 md:gap-0">
                <div className="flex items-center gap-2">
                    <p className="text-gray-400 text-xs md:text-sm font-medium whitespace-nowrap">{t('aggressiveness.title')}</p>
                    {onInfoClick && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onInfoClick(); }}
                            className="text-gray-500 hover:text-white"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                        </button>
                    )}
                </div>
                {/* MODIFIED: Changed styling to be smaller and not bold. Hidden by default on mobile. */}
                <p className={`text-xs md:text-sm text-gray-400 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
                    {formatPercentage(score, i18n.language)}
                </p>
            </div>

            <div className="w-full bg-gray-700 rounded-full h-3 relative">
                <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full"
                    style={{ width: `${score}%` }}
                ></div>
            </div>

            <div className={`flex justify-between text-xs text-gray-400 mt-1 px-1 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
                <span>{t('aggressiveness.defensive')}</span>
                <span>{t('aggressiveness.offensive')}</span>
            </div>
        </div>
    );
};

AggressivenessProgressBar.propTypes = {
    data: PropTypes.shape({
        defensive: PropTypes.number.isRequired,
        neutral: PropTypes.number.isRequired,
        offensive: PropTypes.number.isRequired,
    }).isRequired,
    analyzedCount: PropTypes.number.isRequired,
    onInfoClick: PropTypes.func,
    alwaysVisible: PropTypes.bool,
};

export default AggressivenessProgressBar;