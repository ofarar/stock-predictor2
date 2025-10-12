// src/components/GoldenFeed.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const PostCard = ({ post, locale }) => {
    const { t } = useTranslation();

    let percentChange = null;
    if (post.attachedPrediction?.priceAtCreation > 0) {
        const initial = post.attachedPrediction.priceAtCreation;
        const target = post.attachedPrediction.targetPrice;
        percentChange = ((target - initial) / initial) * 100;
    }

    // 🧠 format percentage properly for each locale
    const formatPercent = (value) => {
        const formatter = new Intl.NumberFormat(locale, {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        });
        // Intl.NumberFormat returns "1.2%" for 0.012 -> so divide by 100
        return formatter.format(value / 100);
    };

    return (
        <div className="bg-gray-700 p-4 rounded-lg relative">
            {post.isNew && (
                <span className="absolute top-2 right-2 text-xs bg-green-500 text-white font-bold px-2 py-1 rounded-full animate-pulse">
                    {t('goldenFeed.newTag')}
                </span>
            )}

            <p className="text-gray-300 whitespace-pre-wrap">{post.message}</p>

            {post.attachedPrediction?.stockTicker && (
                <div className="border-t border-gray-600 mt-4 pt-3">
                    <p className="text-xs text-gray-400 font-bold">{t('goldenFeed.attachedPrediction')}</p>
                    <div className="flex justify-between items-center mt-1">
                        <span className="font-semibold text-white">{post.attachedPrediction.stockTicker}</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-green-400 font-bold">
                                ${post.attachedPrediction.targetPrice.toFixed(2)}
                            </span>
                            {percentChange !== null && (
                                <span
                                    className={`text-xs font-bold ${
                                        percentChange >= 0 ? 'text-green-400' : 'text-red-400'
                                    }`}
                                >
                                    {percentChange >= 0 ? '+' : ''}
                                    {formatPercent(percentChange)}
                                </span>
                            )}
                        </div>
                        <span className="text-sm bg-gray-600 px-2 py-1 rounded-md">
                            {post.attachedPrediction.predictionType}
                        </span>
                    </div>
                </div>
            )}

            <p className="text-xs text-gray-500 text-right mt-3">
                {new Date(post.createdAt).toLocaleString(locale)}
            </p>
        </div>
    );
};

const GoldenFeed = ({ profileUser, onJoinClick }) => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language || 'en';
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAllowed, setIsAllowed] = useState(false);

    useEffect(() => {
        axios
            .get(`${process.env.REACT_APP_API_URL}/api/posts/golden/${profileUser._id}`, {
                withCredentials: true
            })
            .then((res) => {
                setIsAllowed(res.data.isAllowed);
                setPosts(res.data.posts);
                if (res.data.isAllowed) {
                    setTimeout(() => {
                        axios
                            .post(`${process.env.REACT_APP_API_URL}/api/golden-feed/mark-as-read`, {}, { withCredentials: true })
                            .catch((err) => console.error('Failed to mark feed as read.', err));
                    }, 2000);
                }
            })
            .catch(() => setIsAllowed(false))
            .finally(() => setLoading(false));
    }, [profileUser._id]);

    if (loading) {
        return <p className="text-gray-500 text-center py-8">{t('goldenFeed.loading')}</p>;
    }

    if (!isAllowed) {
        return (
            <div className="text-center bg-gray-800 p-8 rounded-lg">
                <span className="text-5xl" role="img" aria-label="lock">🔒</span>
                <h3 className="text-2xl font-bold text-white mt-4">
                    {t('goldenFeed.exclusiveContentTitle')}
                </h3>
                <p className="text-gray-400 mt-2">
                    {t('goldenFeed.exclusiveContentDescription', { username: profileUser.username })}
                </p>
                <button
                    onClick={onJoinClick}
                    className="mt-6 font-bold py-3 px-6 rounded-md bg-yellow-500 text-black hover:bg-yellow-400 transition-transform hover:scale-105"
                >
                    {t('goldenFeed.joinButton', { price: profileUser.goldenMemberPrice })}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {posts.length > 0 ? (
                posts.map((post) => <PostCard key={post._id} post={post} locale={locale} />)
            ) : (
                <p className="text-gray-500 text-center py-8">
                    {t('goldenFeed.noPosts', { username: profileUser.username })}
                </p>
            )}
        </div>
    );
};

export default GoldenFeed;
