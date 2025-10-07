import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ScoreboardPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('All-Time');
    const [predictionTypeFilter, setPredictionTypeFilter] = useState('Overall');
    const [stockFilter, setStockFilter] = useState('');

    useEffect(() => {
        // This API call would be updated to use the filters
        // e.g., /api/scoreboard?time=Daily&type=Hourly&stock=TSLA
        axios.get(`${process.env.REACT_APP_API_URL}/api/scoreboard`)
            .then(res => setUsers(res.data))
            .finally(() => setLoading(false));
    }, [timeFilter, predictionTypeFilter, stockFilter]);

    if (loading) return <div className="text-center text-white">Loading scoreboard...</div>;

    const predictionTypes = ['Overall', 'Hourly', 'Daily', 'Weekly', 'Quarterly', 'Yearly'];

    return (
        <div className="w-full max-w-5xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-6 text-center">🏆 Leaderboards</h1>
            
            {/* Advanced Filter Bar */}
            <div className="bg-gray-800 p-4 rounded-lg mb-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Time Filter */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Timeframe</label>
                        <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded">
                            <option>All-Time</option>
                            <option>Monthly</option>
                            <option>Weekly</option>
                        </select>
                    </div>
                    {/* Prediction Type Filter */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Prediction Type</label>
                        <select value={predictionTypeFilter} onChange={e => setPredictionTypeFilter(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded">
                            {predictionTypes.map(type => <option key={type}>{type}</option>)}
                        </select>
                    </div>
                    {/* Stock Filter */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Stock Ticker</label>
                        <input type="text" placeholder="e.g., AAPL" value={stockFilter} onChange={e => setStockFilter(e.target.value.toUpperCase())}
                               className="w-full bg-gray-700 text-white p-2 rounded" />
                    </div>
                </div>
            </div>

            {/* User List */}
            <div className="space-y-3">
                {users.map((user, index) => (
                    <div key={user._id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                        {/* User info, same as before */}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ScoreboardPage;