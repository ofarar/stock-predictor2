import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import StockChart from '../components/StockChart';
import toast from 'react-hot-toast';

const StockPage = ({ onPredictClick, setPageDataRefresher }) => {
    const { ticker } = useParams();
    const [stockData, setStockData] = useState({
        quote: null,
        topPredictors: [],
        activePredictions: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('Overall');

    // Add 'Monthly' to the filter types
    const predictionTypes = ['Overall', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

    const fetchStockData = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            // Pass the current filter as a query parameter
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/stock/${ticker}?type=${filter}`);
            setStockData(response.data);
        } catch (err) {
            console.error("Failed to fetch stock data", err);
            setError(`Could not load data for ${ticker}. Please try another symbol.`);
            toast.error(`Failed to load data for ${ticker}.`);
        } finally {
            setLoading(false);
        }
    }, [ticker, filter]);

    useEffect(() => {
        fetchStockData();
        if (setPageDataRefresher) {
            setPageDataRefresher(() => fetchStockData);
        }
        return () => {
            if (setPageDataRefresher) {
                setPageDataRefresher(null);
            }
        };
    }, [fetchStockData, setPageDataRefresher]);

    if (loading) return <div className="text-center text-white mt-10">Loading stock data...</div>;
    if (error) return <div className="text-center text-red-400 mt-10">{error}</div>;
    if (!stockData.quote) return null;

    const { quote, topPredictors, activePredictions } = stockData;
    const priceChange = quote.regularMarketChange || 0;
    const percentChange = quote.regularMarketChangePercent || 0;

    return (
        <div className="max-w-6xl mx-auto animate-fade-in space-y-8">
            {/* Stock Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-white">{quote.longName || ticker} ({quote.symbol})</h1>
                    <div className="flex items-baseline gap-4">
                        <p className="text-3xl md:text-4xl font-bold text-white">${quote.regularMarketPrice?.toFixed(2)}</p>
                        <p className={`font-semibold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {priceChange >= 0 ? '+' : ''}{priceChange?.toFixed(2)} ({percentChange?.toFixed(2)}%)
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => onPredictClick(quote)}
                    className="text-2xl bg-green-500 text-white rounded-full w-[1.3em] h-[1.3em] flex items-center justify-center hover:bg-green-600 transition-transform hover:scale-110 shadow-lg"
                    title="Make a Prediction"
                >
                    <svg className="w-[0.7em] h-[0.7em]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </button>
            </div>

            {/* THE FIX: Added a wrapper div here to group the content sections */}
            <div className="space-y-8">
                {/* Main Content: Chart and Top Predictors */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-gray-800 p-4 sm:p-6 rounded-lg">
                        <h3 className="text-xl font-bold text-white mb-4">Top Predictors for {ticker}</h3>
                        <div className="flex flex-wrap border-b border-gray-700 mb-4">
                            {predictionTypes.map(type => (
                                <button key={type} onClick={() => setFilter(type)} className={`px-4 py-2 font-bold text-sm transition-colors ${filter === type ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                                    {type}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-3">
                            {topPredictors && topPredictors.length > 0 ? topPredictors.map((user, index) => (
                                <div key={user._id} className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
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
                                        <span className="font-bold text-green-400 text-lg">{user.avgScore.toFixed(1)}</span>
                                        <p className="text-xs text-gray-400">Avg Score</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-gray-500 text-center py-8">No top predictors for this filter yet.</p>
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <StockChart ticker={ticker} />
                    </div>
                </div>

                {/* Active Predictions Section */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-xl font-bold text-white mb-4">Active Predictions on {ticker}</h3>
                    <div className="space-y-3">
                        {activePredictions && activePredictions.length > 0 ? activePredictions.map(p => (
                            <Link to={`/prediction/${p._id}`} key={p._id} className="flex items-center bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition-colors">
                                <img
                                    src={p.userId.avatar || `https://avatar.iran.liara.run/public/boy?username=${p.userId._id}`}
                                    alt="avatar"
                                    className={`w-8 h-8 rounded-full border-2 ${p.userId.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`}
                                />
                                <div className="ml-3 flex-grow">
                                    <p className="text-sm font-semibold text-white">{p.userId.username}</p>
                                    <p className="text-xs text-gray-400">{p.predictionType} Prediction</p>
                                </div>
                                <p className="text-sm font-bold text-white">Target: ${p.targetPrice.toFixed(2)}</p>
                            </Link>
                        )) : (
                            <p className="text-gray-500 text-center py-4">No active predictions for this stock yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockPage;