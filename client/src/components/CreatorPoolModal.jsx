// src/components/CreatorPoolModal.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { formatSharePercentage } from '../utils/formatters';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

// --- Reusable Pie Chart Component ---
const BreakdownPieChart = ({ title, data, t }) => {
    // Sanitize keys for translation (e.g., "AAPL.US" -> "AAPL_US")
    const sanitizedData = {};
    for (const key in data) {
        const sanitizedKey = key.replace(/\./g, '_');
        sanitizedData[sanitizedKey] = data[key];
    }

    const labels = Object.keys(sanitizedData);
    const chartData = {
        labels: labels.map(label => t(`analystRating.pie.labels.${label.toLowerCase()}`, label)),
        datasets: [{
            data: Object.values(sanitizedData), // Use original data
            backgroundColor: labels.map((_, i) => `hsl(${(i * 50) % 360}, 70%, 50%)`),
            borderColor: '#4b5563',
            borderWidth: 1,
        }]
    };

    const pieOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top', labels: { color: '#e5e7eb' } },
            tooltip: {
                callbacks: {
                    label: function (context) {
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
        <div className="w-full max-w-xs mx-auto animate-fade-in-fast">
            <h4 className="text-lg font-semibold text-white text-center mb-2">{title}</h4>
            <Pie data={chartData} options={pieOptions} />
        </div>
    );
};


const CreatorPoolModal = ({ isOpen, onClose, currentProfileId }) => {
    const { t, i18n } = useTranslation();
    const [leaderboard, setLeaderboard] = useState([]);
    const [totalRating, setTotalRating] = useState(1);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [drilldownView, setDrilldownView] = useState(null); // 'predictions', 'shares', 'badges', 'ranks'

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setSelectedUser(null);
            setDrilldownView(null);
            axios.get(`${import.meta.env.VITE_API_URL}/api/leaderboard/rating`, { withCredentials: true })
                .then(res => {
                    setLeaderboard(res.data.users);
                    setTotalRating(res.data.totalAnalystRating);
                })
                .catch(err => console.error("Failed to fetch rating leaderboard", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && !loading && !selectedUser && currentProfileId) {
            const timer = setTimeout(() => {
                const userElement = document.getElementById(`leaderboard-user-${currentProfileId}`);
                if (userElement) {
                    userElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen, loading, selectedUser, currentProfileId]);

    if (!isOpen) return null;

    // --- Main Pie Chart (Total Breakdown) ---
    let totalPieData = null;
    let breakdown = null;
    if (selectedUser) {
        breakdown = selectedUser.analystRating; // Use the full analystRating object
        totalPieData = {
            labels: [
                t('analystRating.pie.predictions', 'Predictions'),
                t('analystRating.pie.badges', 'Badges'),
                t('analystRating.pie.shares', 'Shares'),
                t('analystRating.pie.ranks', 'Ranks'),
                t('analystRating.pie.referrals', 'Referrals'),
                t('analystRating.pie.bonus', 'Bonus')
            ],
            datasets: [{
                data: [
                    breakdown.fromPredictions || 0,
                    breakdown.fromBadges || 0,
                    breakdown.fromShares || 0,
                    breakdown.fromRanks || 0,
                    breakdown.fromReferrals || 0,
                    breakdown.fromBonus || 0
                ],
                backgroundColor: [
                    '#22c55e', // green
                    '#facc15', // yellow
                    '#3b82f6', // blue
                    '#a855f7', // purple
                    '#ec4899', // pink
                    '#f97316'  // <-- 3. ADD NEW COLOR (orange)
                ],
                borderColor: '#4b5563',
                borderWidth: 1,
            }]
        };
    }

    const handlePieClick = (evt, elements) => {
        if (elements.length > 0) {
            const clickedElement = elements[0];
            const label = totalPieData.labels[clickedElement.index];
            const breakdown = selectedUser.analystRating; // Use full object

            if (label === t('analystRating.pie.predictions', 'Predictions') && breakdown.predictionBreakdownByStock && Object.keys(breakdown.predictionBreakdownByStock).length > 0) {
                setDrilldownView('predictions');
            } else if (label === t('analystRating.pie.shares', 'Shares') && breakdown.shareBreakdown && Object.keys(breakdown.shareBreakdown).length > 0) {
                setDrilldownView('shares');
            } else if (label === t('analystRating.pie.badges', 'Badges') && breakdown.badgeBreakdown && Object.keys(breakdown.badgeBreakdown).length > 0) {
                setDrilldownView('badges');
            } else if (label === t('analystRating.pie.ranks', 'Ranks') && breakdown.rankBreakdown && Object.keys(breakdown.rankBreakdown).length > 0) {
                setDrilldownView('ranks');
            }
        }
    };

    const totalPieOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top', labels: { color: '#e5e7eb' } },
            // --- THIS IS THE FIX ---
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `${label}: ${value.toLocaleString()} (${percentage}%)`;
                    }
                }
            }
            // --- END FIX ---
        },
        onClick: handlePieClick
    };

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setDrilldownView(null);
    };

    const handleBackClick = () => {
        // If on a drilldown, go back to total. If on total, go back to list.
        if (drilldownView) {
            setDrilldownView(null);
        } else {
            setSelectedUser(null);
        }
    };

    // Helper function to check if breakdown data exists
    const getBreakdownData = (key) => {
        if (!breakdown) return null;
        const data = breakdown[key];
        if (data && Object.keys(data).length > 0) {
            return data;
        }
        return null;
    };

    const predictionBreakdownData = getBreakdownData('predictionBreakdownByStock');
    const shareBreakdownData = getBreakdownData('shareBreakdown');
    const badgeBreakdownData = getBreakdownData('badgeBreakdown');
    const rankBreakdownData = getBreakdownData('rankBreakdown');

    // Determine the title for the drilldown pie
    let drilldownTitle = '';
    let drilldownData = null;
    if (drilldownView === 'predictions') {
        drilldownTitle = t('creatorPoolModal.predictionsBreakdownTitle');
        drilldownData = predictionBreakdownData;
    } else if (drilldownView === 'shares') {
        drilldownTitle = t('creatorPoolModal.sharesBreakdownTitle');
        drilldownData = shareBreakdownData;
    } else if (drilldownView === 'badges') {
        drilldownTitle = t('creatorPoolModal.badgesBreakdownTitle');
        drilldownData = badgeBreakdownData;
    } else if (drilldownView === 'ranks') {
        drilldownTitle = t('creatorPoolModal.ranksBreakdownTitle');
        drilldownData = rankBreakdownData;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                {/* --- HEADER --- */}
                <div className="flex items-center justify-between mb-4">
                    {selectedUser ? (
                        <button onClick={handleBackClick} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-medium">
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

                {/* --- VIEW 1: Leaderboard List --- */}
                {!selectedUser && (
                    <div className="animate-fade-in-fast">
                        <p className="text-gray-400 text-sm mb-4">
                            {t('creatorPoolModal.description')}
                        </p>
                        <div className="bg-gray-700 p-3 rounded-md text-center mb-4">
                            <p className="text-gray-300 text-sm">{t('creatorPoolModal.totalRating')}</p>
                            <p className="text-2xl font-bold text-white">{totalRating.toLocaleString()}</p>
                        </div>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto px-2 py-1 modern-scrollbar">
                            {loading ? (
                                <p className="text-gray-400 text-center">{t('explore_loading')}</p>
                            ) : (
                                leaderboard.map((user, index) => {
                                    const isCurrentUser = user._id === currentProfileId;
                                    return (
                                        <button
                                            key={user._id}
                                            id={isCurrentUser ? `leaderboard-user-${user._id}` : undefined}
                                            onClick={() => handleSelectUser(user)}
                                            className={`w-full flex items-center bg-gray-700 p-2 rounded-md hover:bg-gray-600 transition-all ${isCurrentUser ? 'ring-2 ring-green-400' : ''}`}
                                        >
                                            <span className="font-bold text-gray-400 w-8 text-center">{index + 1}</span>
                                            <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full mx-2" />
                                            <span className="text-white font-semibold flex-grow text-start">{user.username}</span>
                                            <div className="text-end">
                                                <p className="font-bold text-green-400">{user.analystRating.total.toLocaleString()}</p>
                                                <p className="text-xs text-gray-400">
                                                    {formatSharePercentage(((user.analystRating.total / totalRating) * 100), i18n.language)}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* --- VIEW 2: Pie Chart Detail View --- */}
                {selectedUser && (
                    <div className="animate-fade-in-fast max-h-[70vh] overflow-y-auto modern-scrollbar pe-2">
                        <div className="space-y-4">
                            {/* User Info */}
                            <div className="flex flex-col items-center">
                                <img src={selectedUser.avatar} alt="avatar" className="w-16 h-16 rounded-full" />
                                <Link
                                    to={`/profile/${selectedUser._id}`}
                                    onClick={onClose}
                                    className="text-xl font-bold text-white mt-2 hover:underline"
                                >
                                    {selectedUser.username}
                                </Link>
                                <p className="text-gray-400">{t('analyst_rating_label')}: {selectedUser.analystRating.total.toLocaleString()}</p>
                            </div>

                            {/* Main Pie Chart */}
                            <div className="w-full max-w-xs mx-auto">
                                <Pie data={totalPieData} options={totalPieOptions} />
                            </div>

                            {/* Drilldown Buttons */}
                            <div className="space-y-2 pt-4 border-t border-gray-700">
                                <h4 className="text-sm font-bold text-gray-400 uppercase text-center">{t('creatorPoolModal.breakdownTitle', 'Breakdown Details')}</h4>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {predictionBreakdownData && (
                                        <button onClick={() => setDrilldownView('predictions')} className={`text-xs font-bold py-1 px-3 rounded-full ${drilldownView === 'predictions' ? 'bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                            {t('analystRating.pie.predictions', 'Predictions')}
                                        </button>
                                    )}
                                    {badgeBreakdownData && (
                                        <button onClick={() => setDrilldownView('badges')} className={`text-xs font-bold py-1 px-3 rounded-full ${drilldownView === 'badges' ? 'bg-yellow-500 text-black' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                            {t('analystRating.pie.badges', 'Badges')}
                                        </button>
                                    )}
                                    {shareBreakdownData && (
                                        <button onClick={() => setDrilldownView('shares')} className={`text-xs font-bold py-1 px-3 rounded-full ${drilldownView === 'shares' ? 'bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                            {t('analystRating.pie.shares', 'Shares')}
                                        </button>
                                    )}
                                    {rankBreakdownData && (
                                        <button onClick={() => setDrilldownView('ranks')} className={`text-xs font-bold py-1 px-3 rounded-full ${drilldownView === 'ranks' ? 'bg-purple-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                            {t('analystRating.pie.ranks', 'Ranks')}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Drilldown Chart Container */}
                            {drilldownView && (
                                <BreakdownPieChart title={drilldownTitle} data={drilldownData} t={t} />
                            )}
                        </div>
                    </div>
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