import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import StockChart from '../components/StockChart';
import toast from 'react-hot-toast';
import VerifiedTick from '../components/VerifiedTick';
import { formatCurrency } from '../utils/formatters';

const StockPage = ({ onPredictClick, setPageDataRefresher, settings }) => {
    const { t, i18n } = useTranslation();
    const { ticker } = useParams();
    const [stockData, setStockData] = useState({
        quote: null,
        topPredictors: [],
        activePredictions: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('Overall');
    const [currentUser, setCurrentUser] = useState(null);

    const predictionTypes = ['Overall', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

    const fetchStockData = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/stock/${ticker}?type=${filter}`);
            setStockData(response.data);
        } catch (err) {
            console.error("Failed to fetch stock data", err);
            setError(t('could_not_load_stock_data', { ticker }));
            toast.error(t('error_loading_stock_data', { ticker }));
        } finally {
            setLoading(false);
        }
    }, [ticker, filter, t]);

    useEffect(() => {
        fetchStockData();
        if (setPageDataRefresher) {
            setPageDataRefresher(() => fetchStockData);
        }
        axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true })
            .then(res => setCurrentUser(res.data));

        return () => {
            if (setPageDataRefresher) {
                setPageDataRefresher(null);
            }
        };
    }, [fetchStockData, setPageDataRefresher]);

    const handleWatchlistToggle = () => {
        const isWatching = currentUser?.watchlist?.includes(ticker);
        const action = isWatching ? 'remove' : 'add';

        const promise = axios.put(`${process.env.REACT_APP_API_URL}/api/watchlist`, { ticker, action }, { withCredentials: true })
            .then(res => {
                setCurrentUser(prev => ({ ...prev, watchlist: res.data.watchlist }));
            });

        toast.promise(promise, {
            loading: t('loading_stock_data'),
            success: isWatching ? t('remove_from_watchlist') + ` ${ticker}` : t('add_to_watchlist') + ` ${ticker}`,
            error: t('error_loading_stock_data'),
        });
    };

    if (loading) return <div className="text-center text-white mt-10">{t('loading_stock_data')}</div>;
    if (error) return <div className="text-center text-red-400 mt-10">{error}</div>;
    if (!stockData.quote) return null;

    const { quote, topPredictors, activePredictions } = stockData;
    const priceChange = quote.regularMarketChange || 0;
    const percentChange = quote.regularMarketChangePercent || 0;
    const isWatching = currentUser?.watchlist?.includes(ticker);
    const currentPrice = quote.regularMarketPrice || 0;

    return (
        <div className="max-w-6xl mx-auto animate-fade-in space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-white">{quote.longName || ticker} ({quote.symbol})</h1>
                    <div className="flex items-baseline gap-4">
                        <p className="text-3xl md:text-4xl font-bold text-white">
                            {formatCurrency(quote.regularMarketPrice, i18n.language, quote.currency)}
                        </p>
                        <p className={`font-semibold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {priceChange >= 0 ? '+' : ''}{priceChange?.toFixed(2)} ({percentChange?.toFixed(2)}%)
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleWatchlistToggle}
                        className={`p-2 rounded-full transition-colors disabled:opacity-50 ${isWatching ? 'bg-red-500/10 text-red-500' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                        title={isWatching ? t('remove_from_watchlist') : t('add_to_watchlist')}
                        disabled={!currentUser}
                    >
                        {isWatching
                            ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"></path></svg>
                            : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                        }
                    </button>

                    <button
                        onClick={() => onPredictClick(quote)}
                        className="text-2xl bg-green-500 text-white rounded-full w-[1.5em] h-[1.5em] flex items-center justify-center hover:bg-green-600 transition-transform hover:scale-110 shadow-lg"
                        title={t('make_prediction')}
                    >
                        +
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-gray-800 p-4 sm:p-6 rounded-lg">
                        <h3 className="text-xl font-bold text-white mb-4">{t('top_predictors_for', { ticker })}</h3>
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
                                        <div className="flex items-center gap-2 ml-3 sm:ml-4">
                                            <Link to={`/profile/${user._id}`} className="font-semibold text-white hover:underline">
                                                {user.username}
                                            </Link>
                                            {settings?.isVerificationEnabled && user.isVerified && <VerifiedTick />}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-green-400 text-lg">{user.avgScore.toFixed(1)}</span>
                                        <p className="text-xs text-gray-400">{t('avg_score')}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-gray-500 text-center py-8">{t('no_top_predictors')}</p>
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <StockChart ticker={ticker} />
                    </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-xl font-bold text-white mb-4">{t('active_predictions_on', { ticker })}</h3>
                    <div className="space-y-3">
                        {activePredictions && activePredictions.length > 0 ? activePredictions.map(p => {
                            let percentageChange = 0;
                            if (currentPrice > 0) {
                                percentageChange = ((p.targetPrice - currentPrice) / currentPrice) * 100;
                            }
                            return (
                                <Link to={`/prediction/${p._id}`} key={p._id} className="flex items-center bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition-colors">
                                    <img src={p.userId.avatar || `https://avatar.iran.liara.run/public/boy?username=${p.userId._id}`} alt="avatar" className={`w-8 h-8 rounded-full border-2 ${p.userId.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`} />
                                    <div className="ml-3 flex-grow">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-white">{p.userId.username}</p>
                                            {settings?.isVerificationEnabled && p.userId.isVerified && <VerifiedTick />}
                                        </div>
                                        <p className="text-xs text-gray-400">{t('prediction_type', { type: p.predictionType })}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white">{t('target', { targetPrice: p.targetPrice.toFixed(2) })}</p>
                                        <p className={`text-xs font-bold ${percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            ({percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%)
                                        </p>
                                    </div>
                                </Link>
                            );
                        }) : (
                            <p className="text-gray-500 text-center py-4">{t('no_active_predictions')}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockPage;
