// src/components/BadgeInfoModal.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BadgeInfoModal = ({ isOpen, onClose }) => {
    const [badgeSettings, setBadgeSettings] = useState(null);

    useEffect(() => {
        if (isOpen) {
            axios.get(`${process.env.REACT_APP_API_URL}/api/settings`)
                .then(res => {
                    if (res.data && res.data.badgeSettings) {
                        setBadgeSettings(res.data.badgeSettings);
                    }
                });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white mb-4">How Achievements Work</h2>
                
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {!badgeSettings ? <p className="text-gray-400">Loading details...</p> : 
                        Object.values(badgeSettings).map(badge => (
                            <div key={badge.name} className="bg-gray-700 p-4 rounded-lg">
                                <h3 className="font-bold text-lg text-white">{badge.name}</h3>
                                <p className="text-sm text-gray-400 italic mb-3">{badge.description}</p>
                                <div className="flex flex-wrap gap-4">
                                    {badge.tiers && Object.entries(badge.tiers).map(([tier, criteria]) => (
                                        <div key={tier} className="text-center text-xs p-2 bg-gray-800 rounded">
                                            <p className="font-bold">{tier}</p>
                                            <p className="text-gray-300">Score > {criteria.score}</p>
                                        </div>
                                    ))}
                                </div>
                                {badge.minPredictions && <p className="text-xs text-gray-500 mt-2">Requires at least {badge.minPredictions} predictions.</p>}
                            </div>
                        ))
                    }
                </div>
                
                <div className="flex justify-end mt-6">
                    <button onClick={onClose} className="bg-green-500 text-white font-bold py-2 px-6 rounded-lg">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BadgeInfoModal;