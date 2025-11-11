// src/pages/StockPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import StockChart from '../components/StockChart';
import toast from 'react-hot-toast';
import VerifiedTick from '../components/VerifiedTick';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import LoadMoreButton from '../components/LoadMoreButton';
import CommunitySentiment from '../components/CommunitySentiment';

const StockPage = ({ onPredictClick, settings }) => {
    const { t, i18n } = useTranslation();
    const { ticker } = useParams();

    // State for main page data
    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [showChart, setShowChart] = useState(false);

    // Paginated state for Top Predictors
    const [topPredictors, setTopPredictors] = useState({ items: [], page: 1, totalPages: 0 });
    const [loadingPredictors, setLoadingPredictors] = useState(false);
    const [filter, setFilter] = useState('Overall');

    // Paginated state for Active Predictions
    const [activePredictions, setActivePredictions] = useState({ items: [], page: 1, totalPages: 0 });
    const [loadingActive, setLoadingActive] = useState(false);

    const predictionTypes = ['Overall', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

    const fetchPageData = useCallback(async () => {
        setLoading(true);
        try {
            const [quoteRes, userRes] = await Promise.all([
                axios.get(`${process.env.REACT_APP_API_URL}/api/stock/${ticker}`),
                axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true }).catch(() => ({ data: null })) // Prevent user fetch from breaking page
            ]);
            setQuote(quoteRes.data.quote);
            setCurrentUser(userRes.data);
        } catch (err) {
            setError(t('could_not_load_stock_data', { ticker }));
        } finally {
            setLoading(false);
        }
    }, [ticker, t]);

    const fetchTopPredictors = useCallback(async (pageNum = 1) => {
        setLoadingPredictors(true);
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/stock/${ticker}/top-predictors`, {
                params: { predictionType: filter, page: pageNum }
            });
            setTopPredictors(prev => ({
                items: pageNum === 1 ? res.data.items : [...prev.items, ...res.data.items],
                page: res.data.currentPage,
                totalPages: res.data.totalPages
            }));
        } catch (err) { toast.error("Failed to load top predictors."); }
        finally { setLoadingPredictors(false); }
    }, [ticker, filter]);

    const fetchActivePredictions = useCallback(async (pageNum = 1) => {
        setLoadingActive(true);
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/stock/${ticker}/active-predictions`, {
                params: { page: pageNum }
            });
            setActivePredictions(prev => ({
                items: pageNum === 1 ? res.data.items : [...prev.items, ...res.data.items],
                page: res.data.currentPage,
                totalPages: res.data.totalPages
            }));
        } catch (err) { toast.error("Failed to load active predictions."); }
        finally { setLoadingActive(false); }
    }, [ticker]);

    useEffect(() => {
        fetchPageData();
        fetchActivePredictions(1);
    }, [fetchPageData, fetchActivePredictions]);

    useEffect(() => {
        fetchTopPredictors(1);
    }, [fetchTopPredictors]);

    const handleLoadMorePredictors = () => {
        if (!loadingPredictors && topPredictors.page < topPredictors.totalPages) {
            fetchTopPredictors(topPredictors.page + 1);
        }
    };

    const handleLoadMoreActive = () => {
        if (!loadingActive && activePredictions.page < activePredictions.totalPages) {
            fetchActivePredictions(activePredictions.page + 1);
        }
    };

    const handleWatchlistToggle = () => {
        const isWatching = currentUser?.watchlist?.includes(ticker);
        const action = isWatching ? 'remove' : 'add';
        const promise = axios.put(`${process.env.REACT_APP_API_URL}/api/watchlist`, { ticker, action }, { withCredentials: true })
            .then(res => {
                setCurrentUser(prev => ({ ...prev, watchlist: res.data.watchlist }));
            });
        toast.promise(promise, {
            loading: isWatching ? t('watchlistPage.toast.loadingRemove', { ticker }) : t('watchlistPage.toast.loadingAdd', { ticker }),
            success: t('watchlistPage.toast.successUpdate'),
            error: t('watchlistPage.toast.errorUpdate'),
        });
    };

    if (loading) return <div className="text-center text-white mt-10">{t('loading_stock_data')}</div>;
    if (error) return <div className="text-center text-red-400 mt-10">{error}</div>;

    const priceChange = quote?.regularMarketChange;
    const percentChange = quote?.regularMarketChangePercent;
    const isWatching = currentUser?.watchlist?.includes(ticker);
    const currentPrice = quote?.regularMarketPrice;

    return (
        <div className="max-w-6xl mx-auto animate-fade-in space-y-8">
            {/* This is your original, working header section */}
            <div className="grid grid-cols-[1fr,auto] gap-x-6 gap-y-2 items-end">
                <div className="text-left min-w-0">
                    <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight truncate">
                        {quote?.longName || ticker}
                    </h1>
                    <p className="text-lg text-gray-400">({ticker})</p>
                </div>
                <div className="flex flex-col items-end">
                    <p className="text-3xl md:text-4xl font-bold text-white">
                        {formatCurrency(quote?.regularMarketPrice, i18n.language, quote?.currency)}
                    </p>
                    <p className={`font-semibold text-base ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {priceChange >= 0 ? '+' : ''}{formatCurrency(priceChange, i18n.language, quote?.currency)} ({formatPercentage(percentChange, i18n.language)})
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleWatchlistToggle}
                        className={`p-2 rounded-full transition-colors disabled:opacity-50 ${isWatching ? 'bg-red-500/20 text-red-500' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                        title={isWatching ? t('remove_from_watchlist') : t('add_to_watchlist')}
                        disabled={!currentUser}
                    >
                        <svg className="w-5 h-5" fill={isWatching ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                    </button>
                    <button
                        onClick={() => onPredictClick(quote ? quote : { symbol: ticker })}
                        className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-green-600 transition-transform hover:scale-110 shadow-lg"
                        title={t('make_prediction')}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>
                    </button>
                </div>
            </div>

            <CommunitySentiment ticker={ticker} currentPrice={currentPrice} />

            <div className="space-y-8">
                {/* All other sections remain unchanged */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-gray-800 p-4 sm:p-6 rounded-lg">
                        <h3 className="text-xl font-bold text-white mb-4">{t('top_predictors_for', { ticker })}</h3>
                        <div className="flex flex-wrap border-b border-gray-700 mb-4">
                            {predictionTypes.map(type => (
                                <button key={type} onClick={() => setFilter(type)} className={`px-4 py-2 font-bold text-sm transition-colors ${filter === type ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                                    {t(`prediction_types.${type}`)}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-3">
                            {loadingPredictors && topPredictors.page === 1 ? (
                                <p className="text-gray-500 text-center py-8">{t('explore_loading')}</p>
                            ) : topPredictors.items.length > 0 ? topPredictors.items.map((user, index) => (
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
                        <LoadMoreButton
                            onClick={handleLoadMorePredictors}
                            isLoading={loadingPredictors}
                            hasMore={topPredictors.page < topPredictors.totalPages}
                        />
                    </div>
                    <div className="lg:col-span-1">
                        {showChart ? (
                            <StockChart ticker={ticker} />
                        ) : (
                            <div className="bg-gray-800 p-4 sm:p-6 rounded-lg h-96 flex flex-col items-center justify-center text-center">
                                <svg className="w-12 h-12 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"></path></svg>
                                <p className="text-gray-400 mb-4">{t('stockPage.chart.lazyTitle')}</p>
                                <button
                                    onClick={() => setShowChart(true)}
                                    className="bg-gray-700 text-white font-bold py-2 px-5 rounded-lg hover:bg-gray-600"
                                >
                                    {t('stockPage.chart.lazyButton')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-xl font-bold text-white mb-4">{t('active_predictions_on', { ticker })}</h3>
                    <div className="space-y-3">
                        {loadingActive && activePredictions.page === 1 ? (
                            <p className="text-gray-500 text-center py-8">{t('explore_loading')}</p>
                        ) : activePredictions.items.length > 0 ? activePredictions.items.map(p => {
                            const percentageChange =
                                (currentPrice > 0 && p.targetPrice)
                                    ? ((p.targetPrice - currentPrice) / currentPrice) * 100
                                    : null;

                            return (
                                <Link to={`/prediction/${p._id}`} key={p._id} className="flex items-center bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition-colors">
                                    <img src={p.userId.avatar || `https://avatar.iran.liara.run/public/boy?username=${p.userId._id}`} alt="avatar" className={`w-8 h-8 rounded-full border-2 ${p.userId.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`} />
                                    <div className="ml-3 flex-grow">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-white">{p.userId.username}</p>
                                            {settings?.isVerificationEnabled && p.userId.isVerified && <VerifiedTick />}
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            {t('prediction_type', { type: t(`prediction_types.${p.predictionType}`) })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white">{t('target', { targetPrice: p.targetPrice?.toFixed(2) ?? '...' })}</p>
                                        <p className={`text-xs font-bold ${percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {typeof percentageChange === 'number'
                                                ? `(${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%)`
                                                : '(...)'
                                            }
                                        </p>
                                    </div>
                                </Link>
                            );
                        }) : (
                            <p className="text-gray-500 text-center py-4">{t('no_active_predictions')}</p>
                        )}
                    </div>
                    <LoadMoreButton
                        onClick={handleLoadMoreActive}
                        isLoading={loadingActive}
                        hasMore={activePredictions.page < activePredictions.totalPages}
                    />
                </div>
            </div>
        </div>
    );
};

export default StockPage;