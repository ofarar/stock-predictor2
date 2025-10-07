import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import StockFilterSearch from '../components/StockFilterSearch';

const ScoreboardPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    // 'timeFilter' state and logic removed
    const [predictionTypeFilter, setPredictionTypeFilter] = useState('Overall');
    const [stockFilter, setStockFilter] = useState('');

    const predictionTypes = ['Overall', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

    const fetchScoreboard = useCallback(() => {
        setLoading(true);
        axios.get(`${process.env.REACT_APP_API_URL}/api/scoreboard`, {
            params: {
                // 'timeframe' parameter removed
                predictionType: predictionTypeFilter,
                stock: stockFilter
            }
        })
        .then(res => setUsers(res.data))
        .catch(err => {
            console.error("Failed to fetch scoreboard", err);
            toast.error("Could not load scoreboard data.");
        })
        .finally(() => setLoading(false));
    }, [predictionTypeFilter, stockFilter]); // 'timeFilter' removed from dependencies

    useEffect(() => {
        fetchScoreboard();
    }, [fetchScoreboard]);

    return (
        <div className="w-full max-w-5xl mx-auto animate-fade-in px-4">
            <h1 className="text-3xl font-bold text-white mb-6 text-center">🏆 Leaderboards</h1>
            
            <div className="bg-gray-800 p-4 rounded-lg mb-8 space-y-4">
                {/* Grid is now sm:grid-cols-2 since one filter was removed */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Timeframe filter UI is completely removed */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Prediction Type</label>
                        <select value={predictionTypeFilter} onChange={e => setPredictionTypeFilter(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                            {predictionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Filter by Stock</label>
                        <StockFilterSearch onStockSelect={setStockFilter} />
                    </div>
                </div>
            </div>

            {loading ? (
                 <div className="text-center text-white py-10">Loading scoreboard...</div>
            ) : (
                <div className="space-y-3">
                    {/* User list rendering logic remains the same */}
                    {users.length > 0 ? users.map((user, index) => (
                        <div key={user._id} className="bg-gray-800 rounded-lg p-3 sm:p-4 flex items-center justify-between">
                            <div className="flex items-center">
                                <span className="text-xl font-bold w-8 sm:w-10 text-center text-gray-400">{index + 1}</span>
                                <img 
                                    src={user.avatar || `https://avatar.iran.liara.run/public/boy?username=${user._id}`} 
                                    alt="avatar" 
                                    className={`w-10 h-10 rounded-full ml-2 sm:ml-4 border-2 ${user.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`} 
                                />
                                <Link to={`/profile/${user._id}`} className="font-semibold text-white ml-3 sm:ml-4 hover:underline">
                                    {user.username}
                                </Link>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-green-400 text-lg">{user.avgScore}</span>
                                <p className="text-xs text-gray-400">Avg Score</p>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center text-gray-500 py-10">
                            <p className="text-lg font-semibold">No users found for these filters.</p>
                            <p>Try broadening your search criteria.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ScoreboardPage;