import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { formatPercentage } from '../utils/formatters';

const DirectionAccuracyBar = ({ accuracy, correctCount, totalCount, onInfoClick, className, alwaysVisible = false }) => {
    const { t, i18n } = useTranslation();
    const [showPercentage, setShowPercentage] = React.useState(false);

    // If alwaysVisible is true, cursor should be default (no pointer), else pointer on md: default
    // Logic: alwaysVisible -> cursor-default. 
    // Mobile logic: if not alwaysVisible, cursor-pointer.
    // Let's simplify: if alwaysVisible, just cursor-default. Else use existing logic.
    const cursorClass = alwaysVisible ? "cursor-default" : "cursor-pointer md:cursor-default";

    const defaultClasses = `bg-gray-800 p-4 rounded-lg text-center h-full flex flex-col justify-center col-span-1 md:col-span-2 ${cursorClass}`;
    const appliedClasses = className ? className : defaultClasses;

    if (!totalCount || totalCount === 0) {
        return (
            <div className={appliedClasses}>
                <p className="text-gray-400 text-sm font-medium">{t('direction_accuracy.title', 'Direction Accuracy')}</p>
                <p className="text-gray-500 text-xs mt-2">{t('direction_accuracy.noData', 'No assessed predictions')}</p>
            </div>
        );
    }

    const handleContainerClick = (e) => {
        if (alwaysVisible) return;
        // Prevent toggling if clicking the info button (though stopPropagation is on button, good to be safe)
        setShowPercentage(prev => !prev);
    };

    const isVisible = alwaysVisible || showPercentage;

    return (
        <div className={appliedClasses} onClick={handleContainerClick}>
            <div className="flex flex-col md:flex-row justify-between items-center mb-2 gap-1 md:gap-0">
                <div className="flex items-center gap-2">
                    <p className="text-gray-400 text-xs md:text-sm font-medium whitespace-nowrap">{t('direction_accuracy.title', 'Direction Accuracy')}</p>
                    {onInfoClick && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onInfoClick(); }}
                            className="text-gray-500 hover:text-white"
                            title={t('direction_accuracy.info', 'Percentage of predictions where the price moved in the predicted direction')}
                            data-testid="direction-accuracy-info-button"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                        </button>
                    )}
                </div>
                <div className="text-right">
                    {/* MODIFIED: Hidden on mobile by default, shown if clicked. Always shown on desktop OR if alwaysVisible. */}
                    <p
                        className={`text-xs md:text-sm text-gray-400 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}
                        data-testid="direction-accuracy-percentage"
                    >
                        {formatPercentage(accuracy, i18n.language)}
                    </p>
                </div>
            </div>

            <div className="w-full bg-gray-700 rounded-full h-3 relative">
                <div
                    className="bg-gradient-to-r from-teal-500 to-green-500 h-3 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, accuracy))}%` }}
                ></div>
            </div>

            <div
                className={`flex justify-between text-xs text-gray-400 mt-1 px-1 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}
                data-testid="direction-accuracy-details"
            >
                <span>{t('direction_accuracy.details', '{{correct}}/{{total}} Correct', { correct: correctCount, total: totalCount })}</span>
            </div>
        </div>
    );
};

DirectionAccuracyBar.propTypes = {
    accuracy: PropTypes.number.isRequired,
    correctCount: PropTypes.number.isRequired,
    totalCount: PropTypes.number.isRequired,
    onInfoClick: PropTypes.func,
    alwaysVisible: PropTypes.bool,
};

export default DirectionAccuracyBar;
