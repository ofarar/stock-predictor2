import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import StockFilterSearch from '../components/StockFilterSearch';

const WatchlistStockCard = ({ quote, isSelected, onRemove, onClick }) => {
    const priceChange = quote?.regularMarketChange || 0;
    const percentChange = quote?.regularMarketChangePercent || 0;
    return (
        <div className="relative flex-shrink-0 w-64">
             <button onClick={onClick} className={`w-full p-4 rounded-lg text-left transition-colors ${isSelected ? 'bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                <div className="flex justify-between items-baseline">
                    <p className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-white'}`}>{quote.symbol}</p>
                    <p className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-white'}`}>{quote.regularMarketPrice?.toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-baseline mt-1">
                    <p className="text-xs w-2/3 truncate">{quote.longName}</p>
                    <p className={`text-xs font-bold ${isSelected ? 'text-white' : (priceChange >= 0 ? 'text-green-400' : 'text-red-400')}`}>
                        {priceChange >= 0 ? '+' : ''}{percentChange?.toFixed(2)}%
                    </p>
                </div>
            </button>
            {/* New Remove Button - Appears only when selected */}
            {isSelected && (
                <button 
                    onClick={onRemove} 
                    className="absolute top-2 right-2 p-1 bg-black bg-opacity-20 rounded-full text-white hover:bg-opacity-40"
                    title={`Remove ${quote.symbol} from watchlist`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            )}
        </div>
    );
};

const WatchlistPage = () => {
    const [data, setData] = useState({ quotes: [], predictions: {}, recommendedUsers: {} });
    const [loading, setLoading] = useState(true);
    const [selectedTicker, setSelectedTicker] = useState(null);

    const fetchData = useCallback(() => {
        setLoading(true);
        axios.get(`${process.env.REACT_APP_API_URL}/api/watchlist`, { withCredentials: true })
            .then(res => {
                setData(res.data);
                if (res.data.quotes.length > 0) {
                    // If the currently selected ticker is no longer in the list, default to the first one
                    const currentTickers = res.data.quotes.map(q => q.symbol);
                    if (!currentTickers.includes(selectedTicker)) {
                        setSelectedTicker(currentTickers[0]);
                    }
                } else {
                    setSelectedTicker(null);
                }
            })
            .catch(() => toast.error("Could not load watchlist."))
            .finally(() => setLoading(false));
    }, [selectedTicker]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleWatchlistUpdate = (ticker, action) => {
        if (!ticker) return;
        const promise = axios.put(`${process.env.REACT_APP_API_URL}/api/watchlist`, { ticker, action }, { withCredentials: true })
            .then(() => {
                if(action === 'add') setSelectedTicker(ticker);
                fetchData();
            });
        toast.promise(promise, {
            loading: `${action === 'add' ? 'Adding' : 'Removing'} ${ticker}...`,
            success: `Successfully updated watchlist.`,
            error: 'Failed to update.',
        });
    };
    
    if (loading) return <div className="text-center text-gray-400 py-10">Loading Your Watchlist...</div>;

    const selectedPredictions = data.predictions[selectedTicker] || [];
    const selectedRecommended = data.recommendedUsers[selectedTicker] || [];

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-4">My Watchlist</h1>
                <div className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row gap-4">
                    <StockFilterSearch onStockSelect={(ticker) => handleWatchlistUpdate(ticker, 'add')} />
                </div>
            </div>

            {data.quotes.length === 0 ? (
                <div className="text-center bg-gray-800 rounded-lg py-20">
                    <p className="text-lg font-semibold text-gray-400">Your watchlist is empty.</p>
                    <p className="text-gray-500 mt-2">Search for a stock above to start tracking it.</p>
                </div>
            ) : (
                <>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                        {data.quotes.map(q => (
                            <WatchlistStockCard 
                                key={q.symbol} 
                                quote={q} 
                                isSelected={selectedTicker === q.symbol} 
                                onClick={() => setSelectedTicker(q.symbol)}
                                onRemove={() => handleWatchlistUpdate(q.symbol, 'remove')}
                            />
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <div className="lg:col-span-2 space-y-6">
                             <h2 className="text-2xl font-bold text-white">Active Predictions for {selectedTicker}</h2>
                            {selectedPredictions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {selectedPredictions.map(p => (
                                        <Link to={`/prediction/${p._id}`} key={p._id} className="block bg-gray-800 p-4 rounded-lg hover:bg-gray-700">
                                            <div className="flex items-center gap-3 mb-3">
                                                <img src={p.userId.avatar} alt="avatar" className={`w-8 h-8 rounded-full border-2 ${p.userId.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`}/>
                                                <p className="font-semibold text-white text-sm">{p.userId.username}</p>
                                            </div>
                                            <p className="text-center text-xl font-bold text-green-400">${p.targetPrice.toFixed(2)}</p>
                                            <p className="text-center text-xs text-gray-400">{p.predictionType} by {new Date(p.deadline).toLocaleDateString()}</p>
                                        </Link>
                                    ))}
                                </div>
                            ) : ( <p className="text-gray-500 text-center py-8">No active predictions for {selectedTicker}.</p> )}
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <h2 className="text-2xl font-bold text-white">Recommended Experts</h2>
                            {selectedRecommended.length > 0 ? (
                                <div className="bg-gray-800 p-4 rounded-lg space-y-3">
                                    {selectedRecommended.map(user => (
                                        <Link to={`/profile/${user._id}`} key={user._id} className="flex items-center bg-gray-700 p-3 rounded-lg hover:bg-gray-600">
                                            <img src={user.avatar} alt="avatar" className="w-10 h-10 rounded-full"/>
                                            <div className="ml-3 flex-grow">
                                                <p className="font-semibold text-white">{user.username}</p>
                                                <p className="text-xs text-gray-400">Avg Score: <span className="font-bold text-green-400">{user.avgScore}</span></p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : ( <p className="text-gray-500 text-center py-8">No top predictors for this stock yet.</p> )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default WatchlistPage;