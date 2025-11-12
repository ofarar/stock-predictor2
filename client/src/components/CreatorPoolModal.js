// src/components/CreatorPoolModal.js
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { formatSharePercentage } from '../utils/formatters';

const CreatorPoolModal = ({ isOpen, onClose }) => {
    const { t, i18n } = useTranslation();
    const [leaderboard, setLeaderboard] = useState([]);
    const [totalRating, setTotalRating] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            axios.get(`${process.env.REACT_APP_API_URL}/api/leaderboard/rating`, { withCredentials: true })
                .then(res => {
                    setLeaderboard(res.data.users);
                    setTotalRating(res.data.totalAnalystRating);
                })
                .catch(err => console.error("Failed to fetch rating leaderboard", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{t('creatorPoolModal.title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <p className="text-gray-400 text-sm mb-4">
                    {t('creatorPoolModal.description')}
                </p>
                
                <div className="bg-gray-700 p-3 rounded-md text-center mb-4">
                    <p className="text-gray-300 text-sm">{t('creatorPoolModal.totalRating')}</p>
                    <p className="text-2xl font-bold text-white">{totalRating.toLocaleString()}</p>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 modern-scrollbar">
                    {loading ? (
                        <p className="text-gray-400 text-center">{t('explore_loading')}</p>
                    ) : (
                        leaderboard.map((user, index) => (
                            <div key={user._id} className="flex items-center bg-gray-700 p-2 rounded-md">
                                <span className="font-bold text-gray-400 w-8 text-center">{index + 1}</span>
                                <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full mx-2"/>
                                <span className="text-white font-semibold flex-grow">{user.username}</span>
                                <div className="text-right">
                                    <p className="font-bold text-green-400">{user.analystRating.toLocaleString()}</p>
                                    <p className="text-xs text-gray-400">
                                        {formatSharePercentage(((user.analystRating / totalRating) * 100), i18n.language)}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700">
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatorPoolModal;