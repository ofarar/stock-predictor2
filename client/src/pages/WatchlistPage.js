import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import StockFilterSearch from '../components/StockFilterSearch';
import VerifiedTick from '../components/VerifiedTick';

const WatchlistStockCard = ({ quote, isSelected, onRemove, onClick }) => {
    const priceChange = quote?.regularMarketChangePercent || 0;
    return (
        <div className="relative flex-shrink-0 w-56">
            <button onClick={onClick} className={`w-full p-4 rounded-lg text-left transition-colors ${isSelected ? 'bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                <div className="flex justify-between items-baseline">
                    <p className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-white'}`}>{quote.symbol}</p>
                    <p className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-white'}`}>{quote.regularMarketPrice?.toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-baseline mt-1">
                    <p className="text-xs w-2/3 truncate">{quote.longName}</p>
                    <p className={`text-xs font-bold ${isSelected ? 'text-white' : (priceChange >= 0 ? 'text-green-400' : 'text-red-400')}`}>
                        {priceChange >= 0 ? '+' : ''}{priceChange?.toFixed(2)}%
                    </p>
                </div>
            </button>
            {isSelected && (
                <button
                    onClick={onRemove}
                    className="absolute top-1 right-1 p-1 bg-black bg-opacity-20 rounded-full text-white hover:bg-red-500/50"
                    title={`Remove ${quote.symbol} from watchlist`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            )}
        </div>
    );
};

const WatchlistPage = ({ settings }) => {
    const [data, setData] = useState({ quotes: [], predictions: {}, recommendedUsers: {} });
    const [loading, setLoading] = useState(true);
    const [selectedTicker, setSelectedTicker] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [predictionTypeFilter, setPredictionTypeFilter] = useState('All');
    const [sortBy, setSortBy] = useState('date');
    const [visibleCount, setVisibleCount] = useState(6);

    const scrollContainerRef = useRef(null);
    const stockCardRefs = useRef({});

    const predictionTypes = ['All', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

    const fetchData = useCallback(() => {
        setLoading(true);
        axios.get(`${process.env.REACT_APP_API_URL}/api/watchlist`, { withCredentials: true })
            .then(res => {
                setData(res.data);
                if (res.data.quotes.length > 0 && !selectedTicker) {
                    setSelectedTicker(res.data.quotes[0].symbol);
                } else if (res.data.quotes.length === 0) {
                    setSelectedTicker(null);
                }
            })
            .catch(() => toast.error("Could not load watchlist."))
            .finally(() => setLoading(false));
    }, [selectedTicker]);

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true })
            .then(res => setCurrentUser(res.data));
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (selectedTicker && stockCardRefs.current[selectedTicker]) {
            stockCardRefs.current[selectedTicker].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [selectedTicker]);

    const handleWatchlistUpdate = (ticker, action) => {
        if (!ticker) return;
        const promise = axios.put(`${process.env.REACT_APP_API_URL}/api/watchlist`, { ticker, action }, { withCredentials: true })
            .then(() => {
                if (action === 'add') {
                    setSelectedTicker(ticker);
                }
                fetchData();
            });
        toast.promise(promise, {
            loading: `${action === 'add' ? 'Adding' : 'Removing'} ${ticker}...`,
            success: `Successfully updated watchlist.`,
            error: 'Failed to update.',
        });
    };

    const handleFollow = (userIdToFollow) => {
        const promise = axios.post(`${process.env.REACT_APP_API_URL}/api/users/${userIdToFollow}/follow`, {}, { withCredentials: true })
            .then(() => {
                setCurrentUser(prevUser => ({
                    ...prevUser,
                    following: [...prevUser.following, userIdToFollow]
                }));
            });

        toast.promise(promise, {
            loading: 'Following user...',
            success: 'User followed!',
            error: 'Could not follow user.',
        });
    };

    const selectedPredictions = data.predictions[selectedTicker] || [];
    const currentPrice = data.quotes.find(q => q.symbol === selectedTicker)?.regularMarketPrice || 0;

    const filteredAndSortedPredictions = useMemo(() => {
        let processedPredictions = [...selectedPredictions];

        if (predictionTypeFilter !== 'All') {
            processedPredictions = processedPredictions.filter(p => p.predictionType === predictionTypeFilter);
        }

        if (sortBy === 'potential') {
            processedPredictions.sort((a, b) => {
                const changeA = currentPrice > 0 ? Math.abs((a.targetPrice - currentPrice) / currentPrice) : 0;
                const changeB = currentPrice > 0 ? Math.abs((b.targetPrice - currentPrice) / currentPrice) : 0;
                return changeB - changeA;
            });
        } else if (sortBy === 'votes') {
            processedPredictions.sort((a, b) => {
                const voteScoreA = (a.likes?.length || 0) - (a.dislikes?.length || 0);
                const voteScoreB = (b.likes?.length || 0) - (b.dislikes?.length || 0);
                return voteScoreB - voteScoreA;
            });
        } else {
            processedPredictions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        return processedPredictions;
    }, [selectedPredictions, predictionTypeFilter, sortBy, currentPrice]);

    if (loading) return <div className="text-center text-gray-400 py-10">Loading Your Watchlist...</div>;

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-4">My Watchlist</h1>
                <div className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row gap-4">
                    <StockFilterSearch 
                        onStockSelect={(ticker) => handleWatchlistUpdate(ticker, 'add')} 
                        placeholder="Search for stocks to watch (e.g., AAPL)..."
                    />
                </div>
            </div>

            {data.quotes.length === 0 ? (
                <div className="text-center bg-gray-800 rounded-lg py-20">
                    <p className="text-lg font-semibold text-gray-400">Your watchlist is empty.</p>
                    <p className="text-gray-500 mt-2">Search for a stock above to start tracking it.</p>
                </div>
            ) : (
                <>
                    <div ref={scrollContainerRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                        {data.quotes.map(q => (
                            <div key={q.symbol} ref={el => stockCardRefs.current[q.symbol] = el}>
                                <WatchlistStockCard
                                    quote={q}
                                    isSelected={selectedTicker === q.symbol}
                                    onClick={() => setSelectedTicker(q.symbol)}
                                    onRemove={() => handleWatchlistUpdate(q.symbol, 'remove')}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <div className="lg:col-span-2 space-y-6">
                            <h2 className="text-2xl font-bold text-white">Active Predictions for {selectedTicker}</h2>

                            <div className="flex flex-col sm:flex-row gap-4 bg-gray-800 p-3 rounded-lg">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Filter by Type</label>
                                    <select value={predictionTypeFilter} onChange={(e) => setPredictionTypeFilter(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md">
                                        {predictionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Sort By</label>
                                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md">
                                        <option value="date">Most Recent</option>
                                        <option value="votes">Most Voted</option>
                                        <option value="potential">Highest Potential</option>
                                    </select>
                                </div>
                            </div>

                            {filteredAndSortedPredictions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {filteredAndSortedPredictions.slice(0, visibleCount).map(p => {
                                        let percentageChange = 0;
                                        if (currentPrice > 0) {
                                            percentageChange = ((p.targetPrice - currentPrice) / currentPrice) * 100;
                                        }
                                        return (
                                            <Link to={`/prediction/${p._id}`} key={p._id} className="block bg-gray-800 p-4 rounded-lg hover:bg-gray-700">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <img src={p.userId.avatar} alt="avatar" className={`w-8 h-8 rounded-full border-2 ${p.userId.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`} />
                                                    <p className="font-semibold text-white text-sm">{p.userId.username}</p>
                                                    {settings?.isVerificationEnabled && p.userId.isVerified && <VerifiedTick />}
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xl font-bold text-white">${p.targetPrice.toFixed(2)}</p>
                                                    <p className={`text-sm font-bold ${percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        ({percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%)
                                                    </p>
                                                </div>
                                                <p className="text-center text-xs text-gray-400 mt-2">{p.predictionType} by {new Date(p.deadline).toLocaleDateString()}</p>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : (<p className="text-gray-500 text-center py-8">No active predictions match your filters.</p>)}

                            {visibleCount < filteredAndSortedPredictions.length && (
                                <div className="relative text-center">
                                    <hr className="absolute top-1/2 w-full border-t border-gray-700" />
                                    <button
                                        onClick={() => setVisibleCount(prev => prev + 6)}
                                        className="relative bg-gray-800 px-4 py-2 text-sm font-bold text-gray-300 rounded-full border border-gray-700 hover:bg-gray-700 hover:text-white"
                                    >
                                        Load More
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <h2 className="text-2xl font-bold text-white">Recommended Experts</h2>
                            {data.recommendedUsers[selectedTicker]?.length > 0 ? (
                                <div className="bg-gray-800 p-4 rounded-lg space-y-3">
                                    {data.recommendedUsers[selectedTicker].map(user => {
                                        const isFollowing = currentUser?.following.includes(user._id);
                                        return (
                                            <div key={user._id} className="flex items-center bg-gray-700 p-3 rounded-lg">
                                                <img
                                                    src={user.avatar}
                                                    alt="avatar"
                                                    className={`w-10 h-10 rounded-full border-2 ${user.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`} // Golden border fix
                                                />
                                                <div className="ml-3 flex-grow">
                                                    <div className="flex items-center gap-2">
                                                        <Link to={`/profile/${user._id}`} className="font-semibold text-white hover:underline">{user.username}</Link>
                                                        {settings?.isVerificationEnabled && user.isVerified && <VerifiedTick />}
                                                    </div>
                                                    <p className="text-xs text-gray-400">Avg Score: <span className="font-bold text-green-400">{user.avgScore}</span></p>
                                                </div>
                                                {!isFollowing && currentUser && currentUser._id !== user._id && (
                                                    <button
                                                        onClick={() => handleFollow(user._id)}
                                                        className="bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-full hover:bg-blue-700 ml-2"
                                                    >
                                                        Follow
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (<p className="text-gray-500 text-center py-8">No top predictors for this stock yet.</p>)}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default WatchlistPage;