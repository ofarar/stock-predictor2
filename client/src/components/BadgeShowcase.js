// src/components/BadgeShowcase.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Badge from './Badge';
import { useTranslation } from 'react-i18next';

const BadgeShowcase = ({ badges = [], onBadgeClick, onInfoClick }) => {
    const { t } = useTranslation();
    const [badgeDetails, setBadgeDetails] = useState(null);

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/api/settings`)
            .then(res => {
                if (res.data && res.data.badgeSettings) setBadgeDetails(res.data.badgeSettings);
                else setBadgeDetails({});
            });
    }, []);

    const renderContent = () => {
        if (badges.length === 0) 
            return <p className="text-gray-500 px-6 text-center sm:text-left">{t('badgeShowcase.noAchievements')}</p>;

        const sortedBadges = [...badges].sort((a, b) => {
            const tierOrder = { Gold: 0, Silver: 1, Bronze: 2 };
            return tierOrder[a.tier] - tierOrder[b.tier];
        });

        return (
            <div className="flex gap-4 overflow-x-auto pb-4 px-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {sortedBadges.map((badge, index) => {
                    if (!badgeDetails) return null;
                    const details = badgeDetails[badge.badgeId] || { name: t('badgeShowcase.unknownBadge') };
                    const translatedName = t(`badges.${badge.badgeId}.name`, details.name);
                    const translatedDescription = t(`badges.${badge.badgeId}.description`, details.description);
                    return <Badge key={index} name={translatedName} tier={badge.tier} onClick={() => onBadgeClick({ ...details, ...badge, name: translatedName, description: translatedDescription })} />;
                })}
            </div>
        );
    };

    return (
        <div className="bg-gray-800 rounded-lg py-6">
            <div className="flex items-center justify-between px-6 mb-4">
                <h3 className="text-xl font-bold text-white">{t('badgeShowcase.title')}</h3>
                <button onClick={onInfoClick} className="text-gray-400 hover:text-white" title={t('badgeShowcase.infoButtonTitle')}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                    </svg>
                </button>
            </div>
            {renderContent()}
        </div>
    );
};

export default BadgeShowcase;
