import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const StockPage = ({ onPredictClick }) => {
    const { ticker } = useParams();
    const [stockData, setStockData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('Overall');
    const predictionTypes = ['Overall', 'Hourly', 'Daily', 'Weekly', 'Quarterly', 'Yearly'];

    useEffect(() => {
        const fetchStockData = async () => {
            try {
                setLoading(true);
                setError('');
                // This is the live API call to your backend
                const response = await axios.get(`http://localhost:5001/api/stock/${ticker}`);
                setStockData(response.data);
            } catch (err) {
                console.error("Failed to fetch stock data", err);
                setError(`Could not load data for ${ticker}. Please try another symbol.`);
            } finally {
                setLoading(false);
            }
        };

        fetchStockData();
    }, [ticker]);

    if (loading) return <div className="text-center text-white mt-10">Loading stock data...</div>;
    if (error) return <div className="text-center text-red-400 mt-10">{error}</div>;
    if (!stockData || !stockData.quote) return null;

    const { quote, topPredictors } = stockData;

    return (
        <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-white">{quote.longName || ticker} ({quote.symbol})</h1>
                    <div>
                        <p className="text-3xl md:text-4xl font-bold text-white">${quote.regularMarketPrice?.toFixed(2)}</p>
                        <p className={`font-semibold ${quote.regularMarketChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {quote.regularMarketChange?.toFixed(2)} ({quote.regularMarketChangePercent?.toFixed(2)}%)
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => onPredictClick(quote)}
                    className="bg-green-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-600 transition-transform hover:scale-105"
                >
                    Make a Prediction
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Column for Predictors */}
                <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg">
                    <div className="flex flex-wrap border-b border-gray-700 mb-4">
                        {predictionTypes.map(type => (
                            <button key={type} onClick={() => setFilter(type)} className={`px-4 py-2 font-bold text-sm ${filter === type ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                                {type}
                            </button>
                        ))}
                    </div>
                    <div className="space-y-3">
                        {topPredictors && topPredictors.length > 0 ? topPredictors.map((user, index) => (
                             <Link to={`/profile/${user._id}`} key={user._id} className="flex items-center bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition-colors">
                                <span className="font-bold w-8 text-gray-400">{index + 1}</span>
                                <img src={user.avatar || `https://avatar.iran.liara.run/public/boy?username=${user._id}`} alt="avatar" className="w-8 h-8 rounded-full" />
                                <span className="font-semibold text-white ml-3">{user.username}</span>
                                <span className="ml-auto font-bold text-green-400">{user.score} pts</span>
                            </Link>
                        )) : (
                            <p className="text-gray-500 text-center py-4">No top predictors for this stock yet.</p>
                        )}
                    </div>
                </div>
                {/* Sidebar for Chart */}
                <div className="lg:col-span-1 bg-gray-800 p-6 rounded-lg h-96 flex items-center justify-center">
                    <p className="text-gray-500">Stock Chart Placeholder</p>
                </div>
            </div>
        </div>
    );
};

export default StockPage;