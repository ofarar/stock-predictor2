// src/components/BadgeShowcase.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Badge from './Badge';

const BadgeShowcase = ({ badges = [], onBadgeClick }) => {
    const [badgeDetails, setBadgeDetails] = useState(null); // Initialize as null

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/api/settings`)
            .then(res => {
                if (res.data && res.data.badgeSettings) {
                    setBadgeDetails(res.data.badgeSettings);
                } else {
                    setBadgeDetails({}); // Set to empty object if not found
                }
            });
    }, []);

    // FIX: If definitions haven't loaded yet, show a placeholder
    if (badgeDetails === null) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-4">Achievements</h3>
                <p className="text-gray-500 text-center py-4">Loading achievements...</p>
            </div>
        );
    }
    
    if (badges.length === 0) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-4">Achievements</h3>
                <p className="text-gray-500 text-center py-4">No achievements yet. Keep making predictions!</p>
            </div>
        );
    }

    const sortedBadges = [...badges].sort((a, b) => {
        const tierOrder = { Gold: 0, Silver: 1, Bronze: 2 };
        return tierOrder[a.tier] - tierOrder[b.tier];
    });

    return (
        <div className="bg-gray-800 rounded-lg">
            <h3 className="text-xl font-bold text-white p-6 pb-4">Achievements</h3>
            <div className="flex gap-4 overflow-x-auto p-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {sortedBadges.map((badge, index) => {
                    const details = badgeDetails[badge.badgeId] || { name: 'Unknown Badge', description: 'No description available.' };
                    return (
                        <Badge 
                            key={index}
                            name={details.name}
                            tier={badge.tier}
                            onClick={() => onBadgeClick({ ...details, ...badge })}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default BadgeShowcase;