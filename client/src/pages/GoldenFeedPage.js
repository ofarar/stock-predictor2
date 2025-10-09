// src/pages/GoldenFeedPage.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import StockFilterSearch from '../components/StockFilterSearch';

// This is a new, more detailed Post Card for the central feed
const CentralPostCard = ({ post }) => {
    let percentChange = null;
    if (post.attachedPrediction?.priceAtCreation > 0) {
        const initial = post.attachedPrediction.priceAtCreation;
        const target = post.attachedPrediction.targetPrice;
        percentChange = ((target - initial) / initial) * 100;
    }
    
    return (
        <div className="bg-gray-800 p-4 rounded-lg">
            {/* Author Info */}
            <div className="flex items-center mb-3">
                <img src={post.userId.avatar} alt="author avatar" className={`w-8 h-8 rounded-full border-2 ${post.userId.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`} />
                <span className="ml-3 font-semibold text-white">{post.userId.username}</span>
            </div>
            {/* Post Content */}
            <p className="text-gray-300 whitespace-pre-wrap">{post.message}</p>
            {post.attachedPrediction?.stockTicker && (
                <div className="border-t border-gray-700 mt-4 pt-3">
                    <div className="flex justify-between items-center mt-1">
                        <span className="font-semibold text-white">{post.attachedPrediction.stockTicker}</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-green-400 font-bold">${post.attachedPrediction.targetPrice.toFixed(2)}</span>
                            {percentChange !== null && (
                                <span className={`text-xs font-bold ${percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%)
                                </span>
                            )}
                        </div>
                        <span className="text-sm bg-gray-600 px-2 py-1 rounded-md">{post.attachedPrediction.predictionType}</span>
                    </div>
                </div>
            )}
            <p className="text-xs text-gray-500 text-right mt-3">{new Date(post.createdAt).toLocaleString()}</p>
        </div>
    );
};


const GoldenFeedPage = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState([]);
    const [filters, setFilters] = useState({
        authorId: 'All',
        stock: '',
        predictionType: 'All'
    });
    const predictionTypes = ['All', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

    // Fetch the list of subscriptions for the filter dropdown
    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/api/my-subscriptions`, { withCredentials: true })
            .then(res => setSubscriptions(res.data));
    }, []);

    // Fetch the feed posts whenever filters change
    const fetchPosts = useCallback(() => {
        setLoading(true);
        axios.get(`${process.env.REACT_APP_API_URL}/api/golden-feed`, { params: filters, withCredentials: true })
            .then(res => setPosts(res.data))
            .catch(err => console.error("Failed to fetch golden feed", err))
            .finally(() => setLoading(false));
    }, [filters]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-6">Your Golden Feed</h1>
            
            <div className="bg-gray-800 p-4 rounded-lg mb-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Filter by Member</label>
                        <select onChange={(e) => handleFilterChange('authorId', e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md">
                            <option value="All">All Subscriptions</option>
                            {subscriptions.map(sub => <option key={sub._id} value={sub._id}>{sub.username}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Filter by Stock</label>
                        <StockFilterSearch onStockSelect={(stock) => handleFilterChange('stock', stock)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Prediction Type</label>
                        <select onChange={(e) => handleFilterChange('predictionType', e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md">
                            {predictionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <p className="text-center text-gray-400 py-10">Loading Feed...</p>
            ) : (
                <div className="space-y-4">
                    {posts.length > 0 ? (
                        posts.map(post => <CentralPostCard key={post._id} post={post} />)
                    ) : (
                        <div className="text-center bg-gray-800 rounded-lg py-20">
                            <p className="text-lg font-semibold text-gray-400">No posts found for these filters.</p>
                            <p className="text-gray-500">Try broadening your search criteria or subscribing to more Golden Members.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GoldenFeedPage;