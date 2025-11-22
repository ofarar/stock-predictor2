import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import StockFilterSearch from '../components/StockFilterSearch';
import GoldenPostForm from '../components/GoldenPostForm';
import VerifiedTick from '../components/VerifiedTick';
import { formatPercentage, formatDateTime } from '../utils/formatters';
import LoadMoreButton from '../components/LoadMoreButton';

const CentralPostCard = ({ post, settings }) => {
    const { t, i18n } = useTranslation();
    let percentChange = null;
    if (post.attachedPrediction?.priceAtCreation > 0) {
        const initial = post.attachedPrediction.priceAtCreation;
        const target = post.attachedPrediction.targetPrice;
        percentChange = ((target - initial) / initial) * 100;
    }

    return (
        <div className="bg-gray-800 p-4 rounded-lg relative">
            {post.isNew && (
                <span className="absolute top-3 end-3 text-xs bg-yellow-500 text-black font-bold px-2 py-1 rounded-full animate-pulse">
                    {t('golden_feed_new_label')}
                </span>
            )}
            <div className="flex items-center mb-3">
                <img src={post.userId.avatar} alt={t('author_avatar')} className={`w-8 h-8 rounded-full border-2 ${post.userId.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`} />
                <span className="ms-3 font-semibold text-white me-[2px]">{post.userId.username}</span>
                {settings?.isVerificationEnabled && post.userId.isVerified && (
                    <div className="inline-block translate-y-[1px]">
                        <VerifiedTick />
                    </div>
                )}

            </div>
            <p className="text-gray-300 whitespace-pre-wrap">{post.message}</p>
            {post.attachedPrediction?.stockTicker && (
                <div className="border-t border-gray-700 mt-4 pt-3">
                    <div className="flex justify-between items-center mt-1">
                        <span className="font-semibold text-white">{post.attachedPrediction.stockTicker}</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-green-400 font-bold">${post.attachedPrediction.targetPrice.toFixed(2)}</span>
                            {percentChange !== null && (
                                <span className={`text-xs font-bold ${percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ({formatPercentage(percentChange, i18n.language)})
                                </span>
                            )}
                        </div>
                        <span className="text-sm bg-gray-600 px-2 py-1 rounded-md">
                            {t(`predictionTypes.${post.attachedPrediction.predictionType.toLowerCase()}`)}
                        </span>
                    </div>
                </div>
            )}
            <p className="text-xs text-gray-500 text-end mt-3">
                {formatDateTime(post.createdAt, i18n.language)}
            </p>
        </div>
    );
};


const GoldenFeedPage = ({ settings }) => {
    const { t } = useTranslation();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState([]);
    const [filters, setFilters] = useState({ authorId: 'All', stock: '', predictionType: 'All' });
    const [currentUser, setCurrentUser] = useState(null);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const predictionTypes = ['All', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

    const markFeedAsRead = useCallback(() => {
        axios.post(`${import.meta.env.VITE_API_URL}/api/golden-feed/mark-as-read`, {}, { withCredentials: true })
            .catch(err => console.error(t('golden_feed_failed_mark_read'), err));
    }, [t]);

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/auth/current_user`, { withCredentials: true })
            .then(res => setCurrentUser(res.data));
    }, []);

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/api/my-subscriptions`, { withCredentials: true })
            .then(res => setSubscriptions(res.data));
    }, []);

    const fetchPosts = useCallback((currentPage, isNewFilter) => {
        setLoading(true);
        axios.get(`${import.meta.env.VITE_API_URL}/api/golden-feed`, { params: { ...filters, page: currentPage }, withCredentials: true })
            .then(res => {
                const { posts: newPosts, totalPages: newTotalPages } = res.data;
                setPosts(prev => isNewFilter ? newPosts : [...prev, ...newPosts]);
                setTotalPages(newTotalPages);
            })
            .catch(err => console.error(t('golden_feed_failed_fetch'), err))
            .finally(() => setLoading(false));
    }, [filters, t]);

    useEffect(() => {
        setPage(1);
        fetchPosts(1, true);
        const timer = setTimeout(markFeedAsRead, 2000);
        return () => clearTimeout(timer);
    }, [filters.authorId, filters.stock, filters.predictionType, fetchPosts, markFeedAsRead]);

    useEffect(() => {
        if (page > 1) {
            fetchPosts(page, false);
        }
    }, [page, fetchPosts]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleLoadMore = () => {
        if (page < totalPages) {
            setPage(prev => prev + 1);
        }
    };

    return (
        <>
            <GoldenPostForm
                isOpen={isPostModalOpen}
                onClose={() => setIsPostModalOpen(false)}
                onPostCreated={() => fetchPosts(1, true)}
            />

            <div className="max-w-4xl mx-auto animate-fade-in">
                <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-yellow-400 flex items-center gap-3">
                        {t('golden_feed_header')}
                        {currentUser?.isGoldenMember && (
                            <button
                                onClick={() => setIsPostModalOpen(true)}
                                className="bg-yellow-500/20 text-yellow-500 rounded-full w-8 h-8 flex items-center justify-center hover:bg-yellow-500/30"
                                title={t('golden_feed_create_post')}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </button>
                        )}
                    </h1>
                </div>


                <div className="bg-gray-800 p-4 rounded-lg mb-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">{t('golden_feed_filter_by_member')}</label>
                            <select onChange={(e) => handleFilterChange('authorId', e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md">
                                <option value="All">{t('golden_feed_all_subscriptions')}</option>
                                {subscriptions.map(sub => (
                                    sub.user && <option key={sub.user._id} value={sub.user._id}>{sub.user.username}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">{t('golden_feed_filter_by_stock')}</label>
                            <StockFilterSearch onStockSelect={(stock) => handleFilterChange('stock', stock)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">{t('golden_feed_prediction_type')}</label>
                            <select onChange={(e) => handleFilterChange('predictionType', e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md">
                                {predictionTypes.map(type => (
                                    <option key={type} value={type}>
                                        {t(`predictionTypes.${type.toLowerCase()}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {loading && page === 1 ? (
                    <p className="text-center text-gray-400 py-10">{t('golden_feed_loading')}</p>
                ) : (
                    <>
                        <div className="space-y-4">
                            {posts.length > 0 ? (
                                posts.map(post => <CentralPostCard key={post._id} post={post} settings={settings} />)
                            ) : (
                                <div className="text-center bg-gray-800 rounded-lg py-20">
                                    <p className="text-lg font-semibold text-gray-400">{t('golden_feed_no_posts_title')}</p>
                                    <p className="text-gray-500">{t('golden_feed_no_posts_subtitle')}</p>
                                </div>
                            )}
                        </div>
                        <LoadMoreButton
                            onClick={handleLoadMore}
                            isLoading={loading} // 'loading' will be true when fetching new pages
                            hasMore={page < totalPages}
                        />
                    </>
                )}
            </div>
        </>
    );
};

export default GoldenFeedPage;
