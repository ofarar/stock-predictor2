import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import StockFilterSearch from '../components/StockFilterSearch';

const ScoreboardPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [predictionTypeFilter, setPredictionTypeFilter] = useState('Overall');
    const [stockFilter, setStockFilter] = useState('');

    useEffect(() => {
        // API call would be updated to use filters
        axios.get(`${process.env.REACT_APP_API_URL}/api/scoreboard`)
            .then(res => setUsers(res.data))
            .finally(() => setLoading(false));
    }, [predictionTypeFilter, stockFilter]);

    if (loading) return <div className="text-center text-white">Loading scoreboard...</div>;

    const predictionTypes = ['Overall', 'Hourly', 'Daily', 'Weekly', 'Quarterly', 'Yearly'];

    return (
        <div className="w-full max-w-5xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-6 text-center">🏆 Leaderboards</h1>
            
            <div className="bg-gray-800 p-4 rounded-lg mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Prediction Type</label>
                        <select value={predictionTypeFilter} onChange={e => setPredictionTypeFilter(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md">
                            {predictionTypes.map(type => <option key={type}>{type}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Filter by Stock</label>
                        <StockFilterSearch onStockSelect={setStockFilter} />
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {users.map((user, index) => (
                    <div key={user._id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center">
                            <span className="text-xl font-bold w-10 text-gray-400">{index + 1}</span>
                            <img src={user.avatar || `https://avatar.iran.liara.run/public/boy?username=${user._id}`} alt="avatar" className="w-10 h-10 rounded-full ml-4" />
                            <Link to={`/profile/${user._id}`} className="font-semibold text-white ml-4 hover:underline">
                                {user.username}
                            </Link>
                        </div>
                        <span className="font-bold text-green-400 text-lg">{user.score || 0} pts</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ScoreboardPage;