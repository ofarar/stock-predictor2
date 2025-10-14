// src/components/ProfileStats.js
import React from 'react';
import { useTranslation } from 'react-i18next';
import AggressivenessProgressBar from './AggressivenessProgressBar';

const StatCard = ({ label, value, isRank = false }) => {
    const { t } = useTranslation();
    const isTopRank = isRank && value <= 3;
    const displayValue = isRank ? `#${value}` : value;
    return (
        <div className="bg-gray-800 p-4 rounded-lg text-center relative">
            {isTopRank && (<span className="absolute top-2 right-2 text-2xl" title={t('performanceTabs.statCard.topRankTitle', { rank: value })}>⭐</span>)}
            <p className="text-gray-400 text-sm font-medium">{label}</p>
            <p className="text-2xl font-bold text-white">{displayValue}</p>
        </div>
    );
};

const ProfileStats = ({ user, performance, predictionCount, onInfoClick }) => {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label={t('overall_rank_label')} value={performance.overallRank} isRank={true} />
            <StatCard label={t('average_score_label')} value={performance.overallAccuracy.toFixed(1)} />
            <StatCard label={t('total_points_label')} value={Math.round(user.score)} />
            <StatCard label={t('total_predictions_label')} value={predictionCount} />
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