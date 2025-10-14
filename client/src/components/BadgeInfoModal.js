// src/components/BadgeInfoModal.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const BadgeInfoModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
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
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{t('badgeInfoModal.title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 modern-scrollbar">
                    {!badgeSettings ? (
                        <p className="text-gray-400">{t('badgeInfoModal.loadingText')}</p>
                    ) : (
                        // Loop over the keys to build dynamic translation paths
                        Object.keys(badgeSettings).map(badgeKey => {
                            const badge = badgeSettings[badgeKey];
                            return (
                                <div key={badgeKey} className="bg-gray-700 p-4 rounded-lg">
                                    <h3 className="font-bold text-lg text-white">
                                        {/* Use the key to find the name, with the DB value as a fallback */}
                                        {t(`badges.${badgeKey}.name`, badge.name)}
                                    </h3>
                                    <p className="text-sm text-gray-400 italic mb-3">
                                        {/* Use the key to find the description, with the DB value as a fallback */}
                                        {t(`badges.${badgeKey}.description`, badge.description)}
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        {badge.tiers && Object.entries(badge.tiers).map(([tier, criteria]) => (
                                            <div key={tier} className="text-center text-xs p-2 bg-gray-800 rounded">
                                                <p className="font-bold">{t(`badges.tiers.${tier}`, tier)}</p>
                                                <p className="text-gray-300">
                                                    {t('badgeInfoModal.scoreLabel', { score: criteria.score })}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                    {badge.minPredictions && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            {t('badgeInfoModal.minPredictions', { count: badge.minPredictions })}
                                        </p>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
                
                <div className="flex justify-end mt-6 pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700">
                        {t('badgeInfoModal.closeButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BadgeInfoModal;