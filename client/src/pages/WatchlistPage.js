import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import VerifiedTick from '../components/VerifiedTick';
import AddStockModal from '../components/AddStockModal';
import WatchlistCard from '../components/WatchlistCard';
import { formatCurrency, formatDate, formatPercentage } from '../utils/formatters';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '../components/SortableItem';

const WatchlistPage = ({ settings }) => {
    const { t, i18n } = useTranslation();
    const [data, setData] = useState({ quotes: [], predictions: {}, recommendedUsers: {} });
    const [loading, setLoading] = useState(true);
    const [selectedTicker, setSelectedTicker] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [predictionTypeFilter, setPredictionTypeFilter] = useState('All');
    const [sortBy, setSortBy] = useState('date');
    const [visibleCount, setVisibleCount] = useState(6);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    const predictionTypes = ['All', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

    const fetchAllData = useCallback(() => {
        setLoading(true);
        Promise.all([
            axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true }),
            axios.get(`${process.env.REACT_APP_API_URL}/api/watchlist`, { withCredentials: true })
        ]).then(([userRes, watchlistRes]) => {
            setCurrentUser(userRes.data);
            setData(watchlistRes.data);
            if (watchlistRes.data.quotes.length > 0 && !selectedTicker) {
                setSelectedTicker(watchlistRes.data.quotes[0].symbol);
            } else if (watchlistRes.data.quotes.length === 0) {
                setSelectedTicker(null);
            }
        }).catch(() => toast.error(t('watchlistPage.toast.errorLoadWatchlist')))
            .finally(() => setLoading(false));
    }, [t, selectedTicker]);

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleWatchlistUpdate = (ticker, action) => {
        if (!ticker) return Promise.reject();
        if (action === 'add' && data.quotes.some(q => q.symbol === ticker)) {
            toast.error(t('watchlistPage.duplicateError', { ticker }));
            return Promise.reject('Duplicate stock');
        }

        const promise = axios.put(`${process.env.REACT_APP_API_URL}/api/watchlist`, { ticker, action }, { withCredentials: true })
            .then(() => {
                fetchAllData();
            });

        toast.promise(promise, {
            loading: action === 'add' ? t('watchlistPage.toast.loadingAdd', { ticker }) : t('watchlistPage.toast.loadingRemove', { ticker }),
            success: t('watchlistPage.toast.successUpdate'),
            error: t('watchlistPage.toast.errorUpdate')
        });
        return promise;
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = data.quotes.findIndex(q => q.symbol === active.id);
            const newIndex = data.quotes.findIndex(q => q.symbol === over.id);
            const reorderedQuotes = arrayMove(data.quotes, oldIndex, newIndex);

            setData(prev => ({ ...prev, quotes: reorderedQuotes }));

            const newTickerOrder = reorderedQuotes.map(q => q.symbol);
            axios.put(`${process.env.REACT_APP_API_URL}/api/watchlist/order`, { tickers: newTickerOrder }, { withCredentials: true })
                .catch(() => {
                    toast.error("Could not save order.");
                    fetchAllData();
                });
        }
    };

    const handleFollow = (userIdToFollow) => {
        const promise = axios.post(`${process.env.REACT_APP_API_URL}/api/users/${userIdToFollow}/follow`, {}, { withCredentials: true })
            .then(() => {
                setCurrentUser((prevUser) => ({
                    ...prevUser,
                    following: [...prevUser.following, userIdToFollow]
                }));
            });

        toast.promise(promise, {
            loading: t('watchlistPage.toast.loadingFollow'),
            success: t('watchlistPage.toast.successFollow'),
            error: t('watchlistPage.toast.errorFollow')
        });
    };

    const selectedPredictions = data.predictions[selectedTicker] || [];
    const currentPrice = data?.quotes?.find((q) => q.symbol === selectedTicker)?.regularMarketPrice || 0;

    const filteredAndSortedPredictions = useMemo(() => {
        let processed = [...selectedPredictions];

        if (predictionTypeFilter !== 'All') {
            processed = processed.filter((p) => p.predictionType === predictionTypeFilter);
        }

        if (sortBy === 'potential') {
            processed.sort((a, b) => {
                const changeA = currentPrice > 0 ? Math.abs((a.targetPrice - currentPrice) / currentPrice) : 0;
                const changeB = currentPrice > 0 ? Math.abs((b.targetPrice - currentPrice) / currentPrice) : 0;
                return changeB - changeA;
            });
        } else if (sortBy === 'votes') {
            processed.sort((a, b) => {
                const voteA = (a.likes?.length || 0) - (a.dislikes?.length || 0);
                const voteB = (b.likes?.length || 0) - (b.dislikes?.length || 0);
                return voteB - voteA;
            });
        } else {
            processed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        return processed;
    }, [selectedPredictions, predictionTypeFilter, sortBy, currentPrice]);

    return (
        <>
            {isAddModalOpen && (
                <AddStockModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onAdd={handleWatchlistUpdate}
                />
            )}
            <div className="animate-fade-in space-y-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-white">{t('watchlistPage.title')}</h1>
                    <button onClick={() => setIsAddModalOpen(true)} className="bg-gray-700 text-gray-400 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    </button>
                    {data?.quotes?.length > 0 && (
                        <button onClick={() => setIsEditMode(prev => !prev)} className="bg-gray-700 text-gray-400 rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-600">
                            {isEditMode ? <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>}
                        </button>
                    )}
                </div>

                {loading ? <div className="text-center text-gray-400 py-10">{t('watchlistPage.loading')}</div> : (
                    data?.quotes?.length === 0 ? (
                        <div className="text-center bg-gray-800 rounded-lg py-20">
                            <p className="text-lg font-semibold text-gray-400">{t('watchlistPage.emptyWatchlist.title')}</p>
                            <p className="text-gray-500 mt-2">{t('watchlistPage.emptyWatchlist.description')}</p>
                        </div>
                    ) : (
                        <>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={data.quotes.map(q => q.symbol)} strategy={horizontalListSortingStrategy}>
                                    <div className={`flex ${isEditMode ? 'gap-2' : 'gap-4'} overflow-x-auto pb-4 modern-scrollbar`}>
                                        {data.quotes.map(q => (
                                            <SortableItem key={q.symbol} id={q.symbol} isEditMode={isEditMode}>
                                                <WatchlistCard
                                                    quote={q}
                                                    isSelected={selectedTicker === q.symbol}
                                                    isEditMode={isEditMode}
                                                    onClick={() => !isEditMode && setSelectedTicker(q.symbol)}
                                                    onRemove={() => handleWatchlistUpdate(q.symbol, 'remove')}
                                                />
                                            </SortableItem>
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                                <div className="lg:col-span-2 space-y-6">
                                    <h2 className="text-2xl font-bold text-white">
                                        {t('watchlistPage.activePredictions', { ticker: selectedTicker })}
                                    </h2>

                                    <div className="flex flex-col sm:flex-row gap-4 bg-gray-800 p-3 rounded-lg">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-400 mb-1">
                                                {t('watchlistPage.filterByTypeLabel')}
                                            </label>
                                            <select
                                                value={predictionTypeFilter}
                                                onChange={(e) => setPredictionTypeFilter(e.target.value)}
                                                className="w-full bg-gray-700 text-white p-2 rounded-md"
                                            >
                                                {predictionTypes.map((type) => (
                                                    <option key={type} value={type}>
                                                        {t(`predictionTypes.${type.toLowerCase()}`)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-400 mb-1">
                                                {t('watchlistPage.sortByLabel')}
                                            </label>
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                                className="w-full bg-gray-700 text-white p-2 rounded-md"
                                            >
                                                <option value="date">{t('watchlistPage.sortOptions.date')}</option>
                                                <option value="votes">{t('watchlistPage.sortOptions.votes')}</option>
                                                <option value="potential">{t('watchlistPage.sortOptions.potential')}</option>
                                            </select>
                                        </div>
                                    </div>

                                    {filteredAndSortedPredictions.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {filteredAndSortedPredictions.slice(0, visibleCount).map((p) => {
                                                const percentageChange =
                                                    currentPrice > 0
                                                        ? ((p.targetPrice - currentPrice) / currentPrice) * 100
                                                        : 0;
                                                return (
                                                    <Link
                                                        to={`/prediction/${p._id}`}
                                                        key={p._id}
                                                        className="block bg-gray-800 p-4 rounded-lg hover:bg-gray-700"
                                                    >
                                                        <div className="flex items-center mb-3">
                                                            <img
                                                                src={p.userId.avatar}
                                                                alt="avatar"
                                                                className={`w-8 h-8 rounded-full border-2 ${p.userId.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`}
                                                            />
                                                            <div className="flex items-center ml-2">
                                                                <p className="font-semibold text-white text-sm mr-[2px]">
                                                                    {p.userId.username}
                                                                </p>
                                                                {settings?.isVerificationEnabled && p.userId.isVerified && (
                                                                    <div className="inline-block translate-y-[1px]">
                                                                        <VerifiedTick />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="text-center">
                                                            <p className="text-xl font-bold text-white">
                                                                {formatCurrency(p.targetPrice, i18n.language, p.currency)}
                                                            </p>
                                                            <p
                                                                className={`text-sm font-bold ${percentageChange >= 0
                                                                    ? 'text-green-400'
                                                                    : 'text-red-400'
                                                                    }`}
                                                            >
                                                                ({formatPercentage(percentageChange, i18n.language)})
                                                            </p>
                                                        </div>
                                                        <p className="text-center text-xs text-gray-400 mt-2">
                                                            {t('watchlistPage.predictionCardFooter', {
                                                                type: t(`predictionTypes.${p.predictionType.toLowerCase()}`),
                                                                date: formatDate(new Date(p.deadline), i18n.language)
                                                            })}
                                                        </p>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-center py-8">
                                            {t('watchlistPage.noPredictions')}
                                        </p>
                                    )}

                                    {visibleCount < filteredAndSortedPredictions.length && (
                                        <div className="relative text-center">
                                            <hr className="absolute top-1/2 w-full border-t border-gray-700" />
                                            <button
                                                onClick={() => setVisibleCount((prev) => prev + 6)}
                                                className="relative bg-gray-800 px-4 py-2 text-sm font-bold text-gray-300 rounded-full border border-gray-700 hover:bg-gray-700 hover:text-white"
                                            >
                                                {t('watchlistPage.loadMore')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="lg:col-span-1 space-y-6">
                                    <h2 className="text-2xl font-bold text-white">
                                        {t('watchlistPage.recommendedPredictors')}
                                    </h2>

                                    {data.recommendedUsers[selectedTicker]?.length > 0 ? (
                                        <div className="bg-gray-800 p-4 rounded-lg space-y-3">
                                            {data.recommendedUsers[selectedTicker].map((user) => {
                                                const isFollowing = currentUser?.following.includes(user._id);
                                                return (
                                                    <div
                                                        key={user._id}
                                                        className="flex items-center bg-gray-700 p-3 rounded-lg"
                                                    >
                                                        <img
                                                            src={user.avatar}
                                                            alt="avatar"
                                                            className={`w-10 h-10 rounded-full border-2 ${user.isGoldenMember
                                                                ? 'border-yellow-400'
                                                                : 'border-gray-600'
                                                                }`}
                                                        />
                                                        <div className="ml-3 flex-grow">
                                                            <div className="flex items-center">
                                                                <Link
                                                                    to={`/profile/${user._id}`}
                                                                    className="font-semibold text-white hover:underline mr-[2px]"
                                                                >
                                                                    {user.username}
                                                                </Link>
                                                                {settings?.isVerificationEnabled && user.isVerified && (
                                                                    <div className="inline-block translate-y-[1px]">
                                                                        <VerifiedTick />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-400">
                                                                {t('watchlistPage.avgScoreLabel')}
                                                                <span className="font-bold text-green-400 ml-1">{user.avgScore}</span>
                                                            </p>
                                                        </div>

                                                        {!isFollowing &&
                                                            currentUser &&
                                                            currentUser._id !== user._id && (
                                                                <button
                                                                    onClick={() => handleFollow(user._id)}
                                                                    className="bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-full hover:bg-blue-700 ml-2"
                                                                >
                                                                    {t('watchlistPage.followingButton')}
                                                                </button>
                                                            )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-center py-8">
                                            {t('watchlistPage.noRecommendedUsers')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </>
                    )
                )}
            </div>
        </>
    );
};

export default WatchlistPage;
