// src/components/ProfileStats.js
import React from 'react';
import { useTranslation } from 'react-i18next';
import AggressivenessProgressBar from './AggressivenessProgressBar';
import { formatSharePercentage } from '../utils/formatters';

const StatCard = ({ label, value, isRank = false, onClick, onInfoClick }) => {
    const { t } = useTranslation();
    const isTopRank = isRank && value <= 3;
    const displayValue = isRank ? `#${value}` : value;
    // Use a button if onClick is provided, else use a div
    const Component = onClick ? 'button' : 'div';
    return (
        <Component
            onClick={onClick}
            className={`bg-gray-800 p-4 rounded-lg text-center relative ${onClick ? 'hover:bg-gray-700 cursor-pointer' : ''}`}
        >
            {isTopRank && (<span className="absolute top-2 right-2 text-2xl" title={t('performanceTabs.statCard.topRankTitle', { rank: value })}>⭐</span>)}
            <div className="flex items-center justify-center gap-1">
                <p className="text-gray-400 text-sm font-medium">{label}</p>
                {/* --- ADD INFO BUTTON --- */}
                {onInfoClick && (
                    <button onClick={onInfoClick} className="text-gray-500 hover:text-white">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                    </button>
                )}
            </div>
            <p className="text-2xl font-bold text-white">{displayValue}</p>
        </Component>
    );
};

const ProfileStats = ({ user, performance, totalAnalystRating, onInfoClick, onCreatorPoolClick, onRatingInfoClick }) => {
    const { t, i18n } = useTranslation();

    // Calculate share percentage, ensure it's a number
    const userRating = user.analystRating?.total || 0; // <-- READ FROM .total
    const totalRating = totalAnalystRating || 1;
    const sharePercent = (userRating / totalRating) * 100;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label={t('overall_rank_label')} value={performance.overallRank} isRank={true} />
            <StatCard label={t('profile_avg_rating')} value={performance.overallAvgRating.toFixed(1)} />
            {/* Replaced 'Total Points' with 'Analyst Rating' */}
            <StatCard
                label={t('analyst_rating_label')}
                value={userRating.toLocaleString()} // <-- Use toLocaleString
                onInfoClick={onRatingInfoClick} // <-- PASS PROP
            />

            {/* New Clickable 'Creator Pool Share' Card */}
            <StatCard
                label={t('creator_pool_share_label')}
                value={formatSharePercentage(sharePercent, i18n.language)}
                onClick={onCreatorPoolClick}
            />

            {performance.aggressiveness && (
                <AggressivenessProgressBar
                    data={performance.aggressiveness.distribution}
                    analyzedCount={performance.aggressiveness.analyzedCount}
                    onInfoClick={onInfoClick}
                />
            )}
        </div>
    );
};

export default ProfileStats;