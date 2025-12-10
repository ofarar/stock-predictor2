import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AggressivenessProgressBar from './AggressivenessProgressBar';
import DirectionAccuracyBar from './DirectionAccuracyBar';
import { formatSharePercentage, formatNumber } from '../utils/formatters';

const StatCard = ({ label, value, isRank = false, onClick, onInfoClick, isAnimated }) => {
    const { t } = useTranslation();
    const isTopRank = isRank && value <= 3;
    const displayValue = isRank ? `#${value}` : value;
    // Always use div to avoid button-in-button hydration errors
    return (
        <div
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
            className={`bg-gray-800 p-4 rounded-lg text-center relative ${onClick ? 'hover:bg-gray-700 cursor-pointer' : ''} ${isAnimated ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`}
        >
            {isTopRank && (<span className="absolute top-2 end-2 text-2xl" title={t('performanceTabs.statCard.topRankTitle', { rank: value })}>⭐</span>)}
            <div className="flex items-center justify-center gap-1">
                <p className="text-gray-400 text-sm font-medium">{label}</p>
                {/* --- ADD INFO BUTTON --- */}
                {onInfoClick && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onInfoClick(); }}
                        className="text-gray-500 hover:text-white"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                    </button>
                )}
            </div>
            <p className="text-2xl font-bold text-white">{displayValue}</p>
        </div>
    );
};

// Import useLocation
import { useLocation } from 'react-router-dom';

const ProfileStats = ({ user, performance, predictions, totalAnalystRating, onInfoClick, onCreatorPoolClick, onRatingInfoClick, onDirectionInfoClick, isCreatorPoolAnimated }) => {
    const { t, i18n } = useTranslation();
    const location = useLocation(); // Get current location

    // Check if we should highlight the stats (e.g. came from prediction detail)
    const shouldHighlight = location.state?.highlightStats;

    // Calculate share percentage, ensure it's a number
    const userRating = user.analystRating?.total || 0;
    const totalRating = totalAnalystRating || 1;
    const sharePercent = (userRating / totalRating) * 100;

    const directionStats = useMemo(() => {
        if (!predictions || predictions.length === 0) return { accuracy: 0, correct: 0, total: 0 };

        // Filter for assessed predictions that have necessary price data
        const assessed = predictions.filter(p => p.status === 'Assessed' && typeof p.priceAtCreation === 'number' && typeof p.actualPrice === 'number');
        const total = assessed.length;

        if (total === 0) return { accuracy: 0, correct: 0, total: 0 };

        const correct = assessed.filter(p => {
            const predictedDir = p.targetPrice - p.priceAtCreation;
            const actualDir = p.actualPrice - p.priceAtCreation;
            // Correct if both are positive or both are negative
            return (predictedDir * actualDir) > 0;
        }).length;

        return {
            accuracy: (correct / total) * 100,
            correct,
            total
        };
    }, [predictions]);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label={t('overall_rank_label')} value={performance.overallRank} isRank={true} />
            <StatCard label={t('profile_avg_rating')} value={performance.overallAvgRating.toFixed(1)} />

            <StatCard
                label={t('analyst_rating_label')}
                value={formatNumber(userRating, i18n.language)}
                onInfoClick={onRatingInfoClick}
                isAnimated={shouldHighlight} // Apply animation here
            />

            <StatCard
                label={t('creator_pool_share_label')}
                value={formatSharePercentage(sharePercent, i18n.language)}
                onClick={onCreatorPoolClick}
                isAnimated={isCreatorPoolAnimated}
            />

            {performance.aggressiveness && (
                <AggressivenessProgressBar
                    data={performance.aggressiveness.distribution}
                    analyzedCount={performance.aggressiveness.analyzedCount}
                    onInfoClick={onInfoClick}
                    className="bg-gray-800 p-4 rounded-lg text-center col-span-1 md:col-span-2 h-full flex flex-col justify-center"
                />
            )}

            <DirectionAccuracyBar
                accuracy={directionStats.accuracy}
                correctCount={directionStats.correct}
                totalCount={directionStats.total}
                className="bg-gray-800 p-4 rounded-lg text-center col-span-1 md:col-span-2 h-full flex flex-col justify-center"
                onInfoClick={onDirectionInfoClick}
            />
        </div>
    );
};

export default ProfileStats;