// src/pages/ExplorePage.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import StockFilterSearch from '../components/StockFilterSearch';

const PredictionCard = ({ prediction }) => {
    if (!prediction.userId) return null;

    const isAssessed = prediction.status === 'Assessed';
    
    // FIX: Calculate percentage change for ACTIVE predictions
    const percentChange = !isAssessed && prediction.currentPrice > 0
        ? ((prediction.targetPrice - prediction.currentPrice) / prediction.currentPrice) * 100
        : 0;

    const errorPercentage = isAssessed && prediction.actualPrice > 0 
        ? Math.abs((prediction.targetPrice - prediction.actualPrice) / prediction.actualPrice) * 100
        : 0;

    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden transition-all hover:shadow-lg hover:shadow-green-500/10">
            <div className="p-4">
                {/* Card Header */}
                <div className="flex items-center mb-4">
                    <img 
                        src={prediction.userId.avatar || `https://avatar.iran.liara.run/public/boy?username=${prediction.userId._id}`} 
                        alt="avatar" 
                        className={`w-10 h-10 rounded-full border-2 ${prediction.userId.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`}
                    />
                    <div className="ml-3">
                        <Link to={`/profile/${prediction.userId._id}`} className="font-bold text-white hover:underline">{prediction.userId.username}</Link>
                        <p className="text-xs text-gray-400">@{prediction.userId.username}</p>
                    </div>
                    <Link to={`/stock/${prediction.stockTicker}`} className="ml-auto text-lg font-bold text-white bg-gray-700 px-3 py-1 rounded-md hover:bg-gray-600">
                        {prediction.stockTicker}
                    </Link>
                </div>

                {/* Card Body */}
                {isAssessed ? (
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-xs text-gray-400">Predicted</p>
                            <p className="font-semibold text-white">${prediction.targetPrice.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Actual Price</p>
                            <p className="font-bold text-lg text-green-400">${(prediction.actualPrice || 0).toFixed(2)}</p>
                        </div>
                        <div>
                             <p className="text-xs text-gray-400">Error</p>
                             <p className={`font-semibold ${errorPercentage > 20 ? 'text-red-400' : 'text-yellow-400'}`}>{errorPercentage.toFixed(1)}%</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-gray-300">Predicts a price of</p>
                        <div className="flex justify-center items-baseline gap-2">
                            <p className="text-3xl font-bold text-green-400 my-2">${prediction.targetPrice.toFixed(2)}</p>
                            {/* FIX: Display the percentage change */}
                            <p className={`text-lg font-bold ${percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%)
                            </p>
                        </div>
                        <p className="text-sm text-gray-500">by {new Date(prediction.deadline).toLocaleDateString()}</p>
                    </div>
                )}
            </div>

            {/* Card Footer */}
            <div className={`flex justify-between items-center text-xs px-4 py-2 ${isAssessed ? 'bg-gray-700' : 'bg-gray-900'}`}>
                <span className="font-semibold text-gray-300">{prediction.predictionType}</span>
                {isAssessed ? (
                     <div className="flex items-center gap-2 font-bold text-white bg-green-500/80 px-2 py-1 rounded-md">
                        <span>Score: {prediction.score}</span>
                    </div>
                ) : (
                    <span className="text-gray-500">Made on {new Date(prediction.createdAt).toLocaleDateString()}</span>
                )}
            </div>
        </div>
    );
};

// The rest of the ExplorePage.js component remains the same
const ExplorePage = () => {
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Active');
    const [filters, setFilters] = useState({
        stock: '',
        predictionType: 'All',
        sortBy: 'date'
    });

    const predictionTypes = ['All', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Yearly'];

    const fetchPredictions = useCallback(() => {
        setLoading(true);
        axios.get(`${process.env.REACT_APP_API_URL}/api/explore/feed`, {
            params: {
                status: activeTab,
                ...filters
            }
        })
        .then(res => setPredictions(res.data))
        .catch(err => console.error("Failed to fetch predictions feed", err))
        .finally(() => setLoading(false));
    }, [activeTab, filters]);

    useEffect(() => {
        fetchPredictions();
    }, [fetchPredictions]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-6">Explore Predictions</h1>
            
            <div className="bg-gray-800 p-4 rounded-lg mb-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Filter by Stock</label>
                        <StockFilterSearch onStockSelect={(stock) => handleFilterChange('stock', stock)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Prediction Type</label>
                        <select onChange={(e) => handleFilterChange('predictionType', e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                            {predictionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Sort By</label>
                        <select onChange={(e) => handleFilterChange('sortBy', e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                            <option value="date">Most Recent</option>
                            <option value="performance">Top Performers</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex border-b border-gray-700 mb-6">
                <button onClick={() => setActiveTab('Active')} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'Active' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>Active</button>
                <button onClick={() => setActiveTab('Assessed')} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'Assessed' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>Recently Assessed</button>
            </div>

            {loading ? (
                <p className="text-center text-gray-400 py-10">Loading Predictions...</p>
            ) : (
                <>
                    {predictions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {predictions.map(p => <PredictionCard key={p._id} prediction={p} />)}
                        </div>
                    ) : (
                        <div className="text-center bg-gray-800 rounded-lg py-20">
                            <p className="text-lg font-semibold text-gray-400">No predictions found for these filters.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ExplorePage;