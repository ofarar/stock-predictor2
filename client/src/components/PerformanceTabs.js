import React, { useState } from 'react';

const StatPill = ({ label, value, rank }) => (
    <div className="flex-1 flex flex-col sm:flex-row justify-between items-baseline bg-gray-700 p-3 rounded-lg">
        <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base">{label}</span>
        </div>
        <div className="text-sm text-gray-400 mt-1 sm:mt-0">
            {/* Updated Label: "Avg Score" */}
            <span className="font-semibold text-green-400">{value}</span> Avg Score
            <span className="ml-3 font-semibold text-blue-400">#{rank}</span> Rank
        </div>
    </div>
);


const PerformanceTabs = ({ performance }) => {
    const [activeTab, setActiveTab] = useState('ByType');

    if (!performance) return null;

    return (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
            <div className="flex border-b border-gray-700 mb-4">
                <button onClick={() => setActiveTab('ByType')} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'ByType' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>By Type</button>
                <button onClick={() => setActiveTab('ByStock')} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'ByStock' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>By Stock</button>
            </div>
            {activeTab === 'ByType' && (
                <div className="space-y-3 animate-fade-in-fast">
                    {performance.byType?.length > 0 ? performance.byType.map(p => (
                        <StatPill key={p.type} label={p.type} value={p.accuracy} rank={p.rank} />
                    )) : <p className="text-gray-500 text-center py-4">No data available for prediction types.</p>}
                </div>
            )}
            {activeTab === 'ByStock' && (
                <div className="space-y-3 animate-fade-in-fast">
                    {performance.byStock?.length > 0 ? performance.byStock.map(s => (
                        <StatPill key={s.ticker} label={s.ticker} value={s.accuracy} rank={s.rank} />
                    )) : <p className="text-gray-500 text-center py-4">No data available for individual stocks.</p>}
                </div>
            )}
        </div>
    );
};

export default PerformanceTabs;