// src/pages/WatchlistPage.js
import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import StockFilterSearch from '../components/StockFilterSearch';
import VerifiedTick from '../components/VerifiedTick';
import Tooltip from '../components/Tooltip';
import { formatPercentage, formatCurrency, formatDate } from '../utils/formatters';

/* =========================
   Drag Handle (top-left)
   ========================= */
const DragHandle = ({ listeners, attributes }) => (
  <div
    {...listeners}
    {...attributes}
    className="absolute -top-1 left-2 z-20 p-2 rounded-md touch-none"
    title="Hold & drag to reorder"
    aria-hidden
  >
    {/* 6-dot icon */}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4 text-gray-400 hover:text-gray-200 transition-colors"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
      role="img"
      aria-label="drag handle"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 6h.01M7 12h.01M7 18h.01M12 6h.01M12 12h.01M12 18h.01M17 6h.01M17 12h.01M17 18h.01" />
    </svg>
  </div>
);

/* =========================
   Sortable stock card
   - uses useSortable, but DOES NOT attach listeners to the card root
     (we attach attributes/listeners only to DragHandle so the handle is the only draggable area)
   ========================= */
const SortableStockCard = ({ quote, isSelected, onClick, onRemove }) => {
  const { i18n } = useTranslation();
  const priceChange = quote?.regularMarketChangePercent || 0;

  // useSortable returns attributes/listeners; we forward them to handle only
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: quote.symbol });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // keep card itself scrollable vertically for accessibility; touchAction on container handles horizontal scroll
  };

  return (
    <div ref={setNodeRef} style={style} className="relative flex-shrink-0 w-56 snap-start select-none">
      {/* Drag handle (only this receives listeners/attributes) */}
      <div className="absolute z-10">
        <div className="relative">
          <DragHandle listeners={listeners} attributes={attributes} />
        </div>
      </div>

      {/* Card main area */}
      <button
        onClick={onClick}
        className={`w-full p-4 rounded-lg text-left transition-colors ${isSelected ? 'bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
      >
        <div className="flex justify-between items-baseline gap-2">
          <p className="font-bold text-lg text-white truncate flex items-center gap-1">
            {quote.symbol}
            {quote.isVerified && <span className="inline-block translate-y-[1px]"><VerifiedTick /></span>}
          </p>

          <Tooltip text="Data delayed">
            <p className="font-bold text-lg text-white">
              {formatCurrency(quote.regularMarketPrice, i18n.language, quote.currency)}
            </p>
          </Tooltip>
        </div>

        <div className="flex justify-between items-baseline mt-1 gap-2">
          <p className="text-xs w-2/3 truncate">{quote.longName}</p>
          <p className={`text-xs font-bold ${isSelected ? 'text-white' : priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercentage(priceChange, i18n.language)}
          </p>
        </div>
      </button>

      {isSelected && (
        <button
          onClick={onRemove}
          className="absolute top-1 right-1 p-1 bg-black bg-opacity-20 rounded-full text-white hover:bg-red-500/50"
          title={`Remove ${quote.symbol}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};


/* =========================
   WatchlistPage (full)
   ========================= */
const WatchlistPage = ({ settings }) => {
  const { t, i18n } = useTranslation();

  const [data, setData] = useState({ quotes: [], predictions: {}, recommendedUsers: {} });
  const [loading, setLoading] = useState(true);
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Filters & UI state from your original file
  const [predictionTypeFilter, setPredictionTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [visibleCount, setVisibleCount] = useState(6);
  const predictionTypes = ['All', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

  const scrollContainerRef = useRef(null);
  const stockCardRefs = useRef({});

  // DnD sensors — long press on touch devices (250ms) prevents accidental drag while swiping
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 250, // ms long-press to activate drag on touch
        tolerance: 5,
      },
    })
  );

  // Fetch user + watchlist (original logic)
  useEffect(() => {
    setLoading(true);

    const fetchAll = async () => {
      try {
        const [userRes, watchlistRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/watchlist`, { withCredentials: true })
        ]);

        const user = userRes.data;
        const watchlistData = watchlistRes.data;

        setCurrentUser(user);
        setData(watchlistData);

        if (watchlistData.quotes.length > 0) {
          setSelectedTicker(prev => prev || watchlistData.quotes[0].symbol);
        } else {
          setSelectedTicker(null);
        }
      } catch (err) {
        toast.error(t('watchlistPage.toast.errorLoadWatchlist'));
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [t]);

  // Scroll selected ticker into view (original logic)
  useEffect(() => {
    if (!loading && selectedTicker && stockCardRefs.current[selectedTicker]) {
      const timer = setTimeout(() => {
        stockCardRefs.current[selectedTicker].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, selectedTicker]);

  // Update watchlist (add/remove)
  const handleWatchlistUpdate = (ticker, action) => {
    if (!ticker) return;
    const promise = axios
      .put(`${process.env.REACT_APP_API_URL}/api/watchlist`, { ticker, action }, { withCredentials: true })
      .then(() => {
        if (action === 'add') setSelectedTicker(ticker);
        // re-fetch updated watchlist only
        return axios.get(`${process.env.REACT_APP_API_URL}/api/watchlist`, { withCredentials: true });
      })
      .then(res => setData(res.data));

    toast.promise(promise, {
      loading: action === 'add'
        ? t('watchlistPage.toast.loadingAdd', { ticker })
        : t('watchlistPage.toast.loadingRemove', { ticker }),
      success: t('watchlistPage.toast.successUpdate'),
      error: t('watchlistPage.toast.errorUpdate')
    });
  };

  // Follow user (original)
  const handleFollow = (userIdToFollow) => {
    const promise = axios
      .post(`${process.env.REACT_APP_API_URL}/api/users/${userIdToFollow}/follow`, {}, { withCredentials: true })
      .then(() => {
        setCurrentUser(prevUser => ({
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

  // DnD: when drag ends, reorder the local list (you can POST new order to backend here)
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = data.quotes.findIndex(q => q.symbol === active.id);
    const newIndex = data.quotes.findIndex(q => q.symbol === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newQuotes = arrayMove([...data.quotes], oldIndex, newIndex);
    setData(prev => ({ ...prev, quotes: newQuotes }));

    // OPTIONAL: persist order to backend:
    // axios.post(`${process.env.REACT_APP_API_URL}/api/watchlist/order`, { order: newQuotes.map(q => q.symbol) }, { withCredentials: true })
    //   .catch(() => toast.error('Could not save order'));
  };

  // Predictions / sorting (original logic)
  const selectedPredictions = data.predictions[selectedTicker] || [];
  const currentPrice = data.quotes.find(q => q.symbol === selectedTicker)?.regularMarketPrice || 0;

  const filteredAndSortedPredictions = useMemo(() => {
    let processed = [...selectedPredictions];

    if (predictionTypeFilter !== 'All') {
      processed = processed.filter(p => p.predictionType === predictionTypeFilter);
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

  if (loading) return <div className="text-center text-gray-400 py-10">{t('watchlistPage.loading')}</div>;

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header + search */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">{t('watchlistPage.title')}</h1>
        <div className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row gap-4">
          <StockFilterSearch
            onStockSelect={(ticker) => handleWatchlistUpdate(ticker, 'add')}
            placeholder={t('watchlistPage.searchPlaceholder')}
          />
        </div>
      </div>

      {/* Empty state */}
      {data.quotes.length === 0 ? (
        <div className="text-center bg-gray-800 rounded-lg py-20">
          <p className="text-lg font-semibold text-gray-400">{t('watchlistPage.emptyWatchlist.title')}</p>
          <p className="text-gray-500 mt-2">{t('watchlistPage.emptyWatchlist.description')}</p>
        </div>
      ) : (
        <>
          {/* Horizontal watchlist with DnD */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={data.quotes.map(q => q.symbol)} strategy={horizontalListSortingStrategy}>
              <div
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto pb-4 snap-x scroll-pl-2"
                style={{ touchAction: 'pan-x' }} // crucial to keep native horizontal scrolling
              >
                {data.quotes.map(q => (
                  <div
                    key={q.symbol}
                    ref={el => (stockCardRefs.current[q.symbol] = el)}
                    className="snap-start"
                  >
                    <SortableStockCard
                      quote={q}
                      isSelected={selectedTicker === q.symbol}
                      onClick={() => setSelectedTicker(q.symbol)}
                      onRemove={() => handleWatchlistUpdate(q.symbol, 'remove')}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Predictions & recommended users (keeps your original layout & functionality) */}
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
                    {predictionTypes.map(type => (
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

              {/* Prediction cards */}
              {filteredAndSortedPredictions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredAndSortedPredictions.slice(0, visibleCount).map(p => {
                    const percentageChange = currentPrice > 0 ? ((p.targetPrice - currentPrice) / currentPrice) * 100 : 0;
                    return (
                      <Link key={p._id} to={`/prediction/${p._id}`} className="block bg-gray-800 p-4 rounded-lg hover:bg-gray-700">
                        <div className="flex items-center mb-3">
                          <img src={p.userId.avatar} alt="avatar" className={`w-8 h-8 rounded-full border-2 ${p.userId.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`} />
                          <div className="flex items-center ml-2">
                            <p className="font-semibold text-white text-sm mr-[2px]">{p.userId.username}</p>
                            {settings?.isVerificationEnabled && p.userId.isVerified && <div className="inline-block translate-y-[1px]"><VerifiedTick /></div>}
                          </div>
                        </div>

                        <div className="text-center">
                          <p className="text-xl font-bold text-white">{formatCurrency(p.targetPrice, i18n.language, p.currency)}</p>
                          <p className={`text-sm font-bold ${percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                <p className="text-gray-500 text-center py-8">{t('watchlistPage.noPredictions')}</p>
              )}

              {/* Load more */}
              {visibleCount < filteredAndSortedPredictions.length && (
                <div className="relative text-center">
                  <hr className="absolute top-1/2 w-full border-t border-gray-700" />
                  <button onClick={() => setVisibleCount(prev => prev + 6)} className="relative bg-gray-800 px-4 py-2 text-sm font-bold text-gray-300 rounded-full border border-gray-700 hover:bg-gray-700 hover:text-white">
                    {t('watchlistPage.loadMore')}
                  </button>
                </div>
              )}
            </div>

            {/* Recommended users */}
            <div className="lg:col-span-1 space-y-6">
              <h2 className="text-2xl font-bold text-white">{t('watchlistPage.recommendedPredictors')}</h2>

              {data.recommendedUsers[selectedTicker]?.length > 0 ? (
                <div className="bg-gray-800 p-4 rounded-lg space-y-3">
                  {data.recommendedUsers[selectedTicker].map(user => {
                    const isFollowing = currentUser?.following.includes(user._id);
                    return (
                      <div key={user._id} className="flex items-center bg-gray-700 p-3 rounded-lg">
                        <img src={user.avatar} alt="avatar" className={`w-10 h-10 rounded-full border-2 ${user.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`} />
                        <div className="ml-3 flex-grow">
                          <div className="flex items-center">
                            <Link to={`/profile/${user._id}`} className="font-semibold text-white hover:underline mr-[2px]">{user.username}</Link>
                            {settings?.isVerificationEnabled && user.isVerified && <VerifiedTick />}
                          </div>
                          <p className="text-xs text-gray-400">{t('watchlistPage.avgScoreLabel')} <span className="font-bold text-green-400 ml-1">{user.avgScore}</span></p>
                        </div>

                        {!isFollowing && currentUser && currentUser._id !== user._id && (
                          <button onClick={() => handleFollow(user._id)} className="bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded-full hover:bg-blue-700 ml-2">
                            {t('watchlistPage.followingButton')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">{t('watchlistPage.noRecommendedUsers')}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WatchlistPage;
