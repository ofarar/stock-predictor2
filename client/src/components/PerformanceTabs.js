// src/components/PerformanceTabs.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// This is the new, minimal progress bar component
const MiniAggressivenessBar = ({ score }) => (
    <div className="w-full bg-gray-900 rounded-full h-1.5 mt-2">
        <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full"
            style={{ width: `${score}%` }}
        ></div>
    </div>
);

const StatCard = ({ label, avgScore, rank, isStock, aggressivenessScore, isSelected, onClick }) => {
    const { t } = useTranslation();
    const circumference = 2 * Math.PI * 20;
    const offset = circumference - (avgScore / 100) * circumference;

    return (
        <div 
            className={`flex flex-col bg-gray-700 p-4 rounded-lg transition-all duration-200 ${isSelected ? 'ring-2 ring-green-400 scale-[1.03]' : 'hover:scale-[1.02]'}`}
        >
            <div className="flex items-center flex-grow">
                {/* Circular Progress Bar for Accuracy */}
                <div className="relative w-12 h-12 flex-shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 44 44">
                        <circle className="text-gray-600" strokeWidth="4" stroke="currentColor" fill="transparent" r="20" cx="22" cy="22"/>
                        <circle className="text-green-400" strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r="20" cx="22" cy="22" transform="rotate(-90 22 22)"/>
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                        {avgScore.toFixed(1)}
                    </span>
                </div>

                {/* Label */}
                <div className="ml-4 flex-grow">
                    {isStock ? (
                        <Link to={`/stock/${label}`} className="font-bold text-white text-lg hover:underline" onClick={e => e.stopPropagation()}>{label}</Link>
                    ) : (
                        <p className="font-bold text-white text-lg">{label}</p>
                    )}
                    <p className="text-sm text-gray-400">{t('performanceTabs.statCard.averageScore')}</p>
                </div>

                {/* Rank Display */}
                <div className="relative flex flex-col items-center justify-center bg-gray-800 rounded-md p-2 ml-2 text-center w-20">
                    {rank <= 3 && (<span className="absolute -top-2 -right-2 text-2xl" title={t('performanceTabs.statCard.topRankTitle', { rank })}>⭐</span>)}
                    <p className="text-xs text-blue-400 font-bold">{t('performanceTabs.statCard.rank')}</p>
                    <p className="text-xl font-bold text-white">#{rank}</p>
                </div>
            </div>
            {/* Add the mini aggressiveness bar at the bottom */}
            <MiniAggressivenessBar score={aggressivenessScore} />
        </div>
    );
};

const PerformanceTabs = ({ performance, onFilterChange }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('ByType');
    const [selectedFilter, setSelectedFilter] = useState(null);

    if (!performance) return null;

    const handleCardClick = (filterKey, performanceData) => {
        if (selectedFilter === filterKey) {
            // If clicking the same card, clear the filter
            setSelectedFilter(null);
            onFilterChange(performance); // Pass overall performance
        } else {
            // Otherwise, set the new filter
            setSelectedFilter(filterKey);
            onFilterChange({ aggressiveness: performanceData.aggressiveness }); // Pass filtered performance
        }
    };

    return (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
            <div className="flex border-b border-gray-700 mb-4">
                <button onClick={() => { setActiveTab('ByType'); setSelectedFilter(null); onFilterChange(performance); }} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'ByType' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    {t('performanceTabs.tabs.byType')}
                </button>
                <button onClick={() => { setActiveTab('ByStock'); setSelectedFilter(null); onFilterChange(performance); }} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'ByStock' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    {t('performanceTabs.tabs.byStock')}
                </button>
            </div>
            {activeTab === 'ByType' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-fast">
                    {performance.byType?.length > 0 ? performance.byType.map(p => (
                        <StatCard 
                            key={p.type} 
                            label={t(`predictionTypes.${p.type.toLowerCase()}`)} 
                            avgScore={p.accuracy} 
                            rank={p.rank} 
                            aggressivenessScore={p.aggressivenessScore}
                            isSelected={selectedFilter === p.type}
                            onClick={() => handleCardClick(p.type, p)}
                        />
                    )) : <p className="md:col-span-2 text-gray-500 text-center py-4">{t('performanceTabs.noData.byType')}</p>}
                </div>
            )}
            {activeTab === 'ByStock' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-fast">
                    {performance.byStock?.length > 0 ? performance.byStock.map(s => (
                        <StatCard 
                            key={s.ticker} 
                            label={s.ticker} 
                            avgScore={s.accuracy} 
                            rank={s.rank} 
                            isStock={true} 
                            aggressivenessScore={s.aggressivenessScore}
                            isSelected={selectedFilter === s.ticker}
                            onClick={() => handleCardClick(s.ticker, s)}
                        />
                    )) : <p className="md:col-span-2 text-gray-500 text-center py-4">{t('performanceTabs.noData.byStock')}</p>}
                </div>
            )}
        </div>
    );
};

export default PerformanceTabs;