// src/components/CreatorPoolModal.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // <-- 1. IMPORT LINK
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { formatSharePercentage } from '../utils/formatters';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const CreatorPoolModal = ({ isOpen, onClose, currentProfileId }) => {
    const { t, i18n } = useTranslation();
    const [leaderboard, setLeaderboard] = useState([]);
    const [totalRating, setTotalRating] = useState(1);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null); // <-- For pie chart

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setSelectedUser(null); // Reset view on open
            axios.get(`${process.env.REACT_APP_API_URL}/api/leaderboard/rating`, { withCredentials: true })
                .then(res => {
                    setLeaderboard(res.data.users);
                    setTotalRating(res.data.totalAnalystRating);
                })
                .catch(err => console.error("Failed to fetch rating leaderboard", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    // --- useEffect to handle scrolling ---
    useEffect(() => {
        if (!isOpen || loading || selectedUser || !currentProfileId) {
            return; // Don't run if modal is closed, loading, in pie view, or no ID provided
        }

        // We need to wait a brief moment for the UI to render before scrolling
        const timer = setTimeout(() => {
            // Find the specific user's row element
            const userElement = document.getElementById(`leaderboard-user-${currentProfileId}`);
            
            if (userElement) {
                // Scroll to it and center it
                userElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 100); // 100ms delay is usually enough

        return () => clearTimeout(timer); // Cleanup the timer
    }, [isOpen, loading, selectedUser, currentProfileId]); // Runs when data is loaded

    if (!isOpen) return null;

    // --- PIE CHART LOGIC ---
    let pieChartData = null;
    if (selectedUser) {
        const breakdown = selectedUser.ratingBreakdown;
        pieChartData = {
            labels: [
                t('analystRating.pie.predictions', 'Predictions'),
                t('analystRating.pie.badges', 'Badges'),
                t('analystRating.pie.shares', 'Shares'),
                t('analystRating.pie.ranks', 'Ranks'),
                t('analystRating.pie.referrals', 'Referrals')
            ],
            datasets: [{
                data: [
                    breakdown.fromPredictions || 0,
                    breakdown.fromBadges || 0,
                    breakdown.fromShares || 0,
                    breakdown.fromRanks || 0,
                    breakdown.fromReferrals || 0
                ],
                backgroundColor: [
                    '#22c55e', // green
                    '#facc15', // yellow
                    '#3b82f6', // blue
                    '#a855f7', // purple
                    '#ec4899'  // pink
                ],
                borderColor: '#4b5563', // gray-600
                borderWidth: 1,
            }]
        };
    }

    const pieChartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#e5e7eb' // gray-200
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `${label}: ${value.toLocaleString()} (${percentage}%)`;
                    }
                }
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                {/* --- HEADER --- */}
                <div className="flex items-center justify-between mb-4">
                    {selectedUser ? (
                        <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-medium">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                            {t('common.back')}
                        </button>
                    ) : (
                        <h2 className="text-2xl font-bold text-white">{t('creatorPoolModal.title')}</h2>
                    )}
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                {/* --- BODY (Conditional) --- */}
                {selectedUser ? (
                    // --- PIE CHART VIEW ---
                    <div className="animate-fade-in-fast space-y-4">
                        <div className="flex flex-col items-center">
                            <img src={selectedUser.avatar} alt="avatar" className="w-16 h-16 rounded-full"/>
                            
                            {/* --- FIX 2: Add Link to Profile --- */}
                            <Link 
                                to={`/profile/${selectedUser._id}`} 
                                onClick={onClose} // Close modal on click
                                className="text-xl font-bold text-white mt-2 hover:underline"
                            >
                                {selectedUser.username}
                            </Link>
                            {/* --- END FIX 2 --- */}

                            <p className="text-gray-400">{t('analyst_rating_label')}: {selectedUser.analystRating.toLocaleString()}</p>
                        </div>
                        <div className="w-full max-w-xs mx-auto">
                            <Pie data={pieChartData} options={pieChartOptions} />
                        </div>
                    </div>
                ) : (
                    // --- LEADERBOARD VIEW ---
                    <>
                        <p className="text-gray-400 text-sm mb-4">
                            {t('creatorPoolModal.description')}
                        </p>
                        
                        <div className="bg-gray-700 p-3 rounded-md text-center mb-4">
                            <p className="text-gray-300 text-sm">{t('creatorPoolModal.totalRating')}</p>
                            <p className="text-2xl font-bold text-white">{totalRating.toLocaleString()}</p>
                        </div>

                        {/* --- FIX 1: Add py-1 for highlight padding --- */}
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 py-1 modern-scrollbar">
                            {loading ? (
                                <p className="text-gray-400 text-center">{t('explore_loading')}</p>
                            ) : (
                                leaderboard.map((user, index) => {
                                    const isCurrentUser = user._id === currentProfileId;
                                    
                                    return (
                                    <button 
                                        key={user._id} 
                                        id={isCurrentUser ? `leaderboard-user-${user._id}` : undefined} // <-- Add ID
                                        onClick={() => setSelectedUser(user)}
                                        // <-- Add highlight ring -->
                                        className={`w-full flex items-center bg-gray-700 p-2 rounded-md hover:bg-gray-600 transition-all ${isCurrentUser ? 'ring-2 ring-green-400' : ''}`}
                                    >
                                        <span className="font-bold text-gray-400 w-8 text-center">{index + 1}</span>
                                        <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full mx-2"/>
                                        <span className="text-white font-semibold flex-grow text-left">{user.username}</span>
                                        <div className="text-right">
                                            <p className="font-bold text-green-400">{user.analystRating.toLocaleString()}</p>
                                            <p className="text-xs text-gray-400">
                                                {formatSharePercentage(((user.analystRating / totalRating) * 100), i18n.language)}
                                            </p>
                                        </div>
                                    </button>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}

                {/* --- FOOTER --- */}
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