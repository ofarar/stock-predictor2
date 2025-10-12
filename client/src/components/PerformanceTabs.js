import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const StatCard = ({ label, avgScore, rank, isStock }) => {
    const { t } = useTranslation();
    const circumference = 2 * Math.PI * 20;
    const offset = circumference - (avgScore / 100) * circumference;

    return (
        <div className="flex items-center bg-gray-700 p-4 rounded-lg transition-transform hover:scale-[1.02]">
            {/* Circular Progress Bar */}
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
                    <Link to={`/stock/${label}`} className="font-bold text-white text-lg hover:underline">{label}</Link>
                ) : (
                    <p className="font-bold text-white text-lg">{label}</p>
                )}
                <p className="text-sm text-gray-400">{t('performanceTabs.statCard.averageScore')}</p>
            </div>

            {/* Rank Display */}
            <div className="relative flex flex-col items-center justify-center bg-gray-800 rounded-md p-2 ml-2 text-center w-20">
                {rank <= 3 && (
                    <span className="absolute -top-2 -right-2 text-2xl" title={t('performanceTabs.statCard.topRankTitle', { rank })}>⭐</span>
                )}
                <p className="text-xs text-blue-400 font-bold">{t('performanceTabs.statCard.rank')}</p>
                <p className="text-xl font-bold text-white">#{rank}</p>
            </div>
        </div>
    );
};


const PerformanceTabs = ({ performance }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('ByType');

    if (!performance) return null;

    return (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
            <div className="flex border-b border-gray-700 mb-4">
                <button onClick={() => setActiveTab('ByType')}
                        className={`px-4 py-2 font-bold transition-colors ${activeTab === 'ByType' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    {t('performanceTabs.tabs.byType')}
                </button>
                <button onClick={() => setActiveTab('ByStock')}
                        className={`px-4 py-2 font-bold transition-colors ${activeTab === 'ByStock' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    {t('performanceTabs.tabs.byStock')}
                </button>
            </div>
            {activeTab === 'ByType' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-fast">
                    {performance.byType?.length > 0 ? performance.byType.map(p => (
                        <StatCard key={p.type} label={p.type} avgScore={p.accuracy} rank={p.rank} />
                    )) : <p className="md:col-span-2 text-gray-500 text-center py-4">{t('performanceTabs.noData.byType')}</p>}
                </div>
            )}
            {activeTab === 'ByStock' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-fast">
                    {performance.byStock?.length > 0 ? performance.byStock.map(s => (
                        <StatCard key={s.ticker} label={s.ticker} avgScore={s.accuracy} rank={s.rank} isStock={true} />
                    )) : <p className="md:col-span-2 text-gray-500 text-center py-4">{t('performanceTabs.noData.byStock')}</p>}
                </div>
            )}
        </div>
    );
};

export default PerformanceTabs;
