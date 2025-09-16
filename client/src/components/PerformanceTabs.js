import React, { useState } from 'react';

const PerformanceTabs = ({ performance }) => {
    const [activeTab, setActiveTab] = useState('ByType'); // 'ByType' or 'ByStock'

    return (
        <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex border-b border-gray-700 mb-4">
                <button onClick={() => setActiveTab('ByType')} className={`px-4 py-2 font-bold ${activeTab === 'ByType' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>By Type</button>
                <button onClick={() => setActiveTab('ByStock')} className={`px-4 py-2 font-bold ${activeTab === 'ByStock' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>By Stock</button>
            </div>
            {activeTab === 'ByType' && (
                <div className="space-y-2">
                    {performance.byType.map(p => (
                        <div key={p.type} className="flex justify-between text-sm p-2 bg-gray-700 rounded">
                            <span className="font-bold text-gray-300">{p.type}</span>
                            <div><span className="text-gray-400">Acc:</span> {p.accuracy} | <span className="text-gray-400">Rank:</span> {p.rank}</div>
                        </div>
                    ))}
                </div>
            )}
            {activeTab === 'ByStock' && (
                <div className="space-y-2">
                    {performance.byStock.map(s => (
                         <div key={s.ticker} className="flex justify-between text-sm p-2 bg-gray-700 rounded">
                            <span className="font-bold text-gray-300">{s.ticker}</span>
                            <div><span className="text-gray-400">Acc:</span> {s.accuracy} | <span className="text-gray-400">Pts:</span> {s.totalPoints}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PerformanceTabs;