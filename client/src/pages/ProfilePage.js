// src/pages/ProfilePage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import PerformanceChart from '../components/PerformanceChart';
import PerformanceTabs from '../components/PerformanceTabs';
import GoldenMemberModal from '../components/GoldenMemberModal';
import JoinGoldenModal from '../components/JoinGoldenModal';
import BadgeShowcase from '../components/BadgeShowcase';
import BadgeDetailModal from '../components/BadgeDetailModal';
import BadgeInfoModal from '../components/BadgeInfoModal';
import GoldenFeed from '../components/GoldenFeed';
import GoldenPostForm from '../components/GoldenPostForm';
import WatchlistShowcase from '../components/WatchlistShowcase'; // <-- 1. Import the new component

const MiniPredictionCard = ({ prediction, currentPrice }) => {
    const isAssessed = prediction.status === 'Assessed';
    // Calculate live percentage change for active predictions
    let percentageChange = null;
    if (!isAssessed && currentPrice > 0) {
        percentageChange = ((prediction.targetPrice - currentPrice) / currentPrice) * 100;
    }
    return (
        <Link to={`/prediction/${prediction._id}`} className="block bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition-colors">
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    <span className="font-bold text-white text-lg">{prediction.stockTicker}</span>
                    <span className="text-xs text-gray-400">{prediction.predictionType}</span>
                </div>
                {isAssessed ? (
                    <div className="text-right">
                        <p className={`font-bold text-xl ${prediction.score > 60 ? 'text-green-400' : 'text-red-400'}`}>{prediction.score.toFixed(1)}</p>
                        <p className="text-xs text-gray-500 -mt-1">Score</p>
                    </div>
                ) : (
                    <div className="text-right">
                        <p className="font-semibold text-lg text-white">${prediction.targetPrice.toFixed(2)}</p>
                        {percentageChange !== null && (
                            <p className={`text-sm font-bold -mt-1 ${percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%
                            </p>
                        )}
                    </div>
                )}
            </div>
        </Link>
    );
};

// --- START: UPDATED StatCard COMPONENT ---
const StatCard = ({ label, value, isRank = false }) => {
    const isTopRank = isRank && value <= 3;
    const displayValue = isRank ? `#${value}` : value;

    return (
        <div className="bg-gray-800 p-4 rounded-lg text-center relative">
            {isTopRank && (
                <span className="absolute top-2 right-2 text-2xl" title={`Top ${value} Rank`}>⭐</span>
            )}
            <p className="text-gray-400 text-sm font-medium">{label}</p>
            <p className="text-2xl font-bold text-white">{displayValue}</p>
        </div>
    );
};
// --- END: UPDATED StatCard COMPONENT ---

const ProfilePage = () => {
    const { userId } = useParams();
    const [profileData, setProfileData] = useState(null);
    const [activePredictionQuotes, setActivePredictionQuotes] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [isGoldenModalOpen, setIsGoldenModalOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [visiblePredictions, setVisiblePredictions] = useState(6);
    const [visibleActive, setVisibleActive] = useState(6);
    const [selectedBadge, setSelectedBadge] = useState(null);
    const [isBadgeInfoOpen, setIsBadgeInfoOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('Profile');
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'GoldenFeed') {
            setActiveTab('GoldenFeed');
        }
    }, [searchParams]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [profileRes, currentUserRes] = await Promise.all([
                // --- FIX: Added { withCredentials: true } to this request ---
                axios.get(`${process.env.REACT_APP_API_URL}/api/profile/${userId}`, { withCredentials: true }),
                axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true })
            ]);

            const profile = profileRes.data;
            setProfileData(profile);
            setCurrentUser(currentUserRes.data);

            // --- START: NEW LOGIC TO FETCH QUOTES ---
            const activePredictions = profile.predictions.filter(p => p.status === 'Active');
            if (activePredictions.length > 0) {
                const tickers = [...new Set(activePredictions.map(p => p.stockTicker))];
                const quotesRes = await axios.post(`${process.env.REACT_APP_API_URL}/api/quotes`, { tickers }, { withCredentials: true });
                const quotesMap = quotesRes.data.reduce((acc, quote) => {
                    acc[quote.symbol] = quote.regularMarketPrice;
                    return acc;
                }, {});
                setActivePredictionQuotes(quotesMap);
            }
            // --- END: NEW LOGIC ---

        } catch (error) {
            toast.error("Could not load profile.");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFollow = () => {
        axios.post(`${process.env.REACT_APP_API_URL}/api/users/${userId}/follow`, {}, { withCredentials: true }).then(() => fetchData());
    };
    const handleUnfollow = () => {
        axios.post(`${process.env.REACT_APP_API_URL}/api/users/${userId}/unfollow`, {}, { withCredentials: true }).then(() => fetchData());
    };

    if (loading) return <div className="text-center text-white mt-10">Loading profile...</div>;
    if (!profileData) return <div className="text-center text-white mt-10">User not found.</div>;

    const { user, predictions, performance, followersCount, followingCount, chartData, watchlistQuotes, goldenSubscribersCount, goldenSubscriptionsCount } = profileData;
    const activePredictions = predictions.filter(p => p.status === 'Active');
    const assessedPredictions = predictions.filter(p => p.status === 'Assessed');
    const isOwnProfile = currentUser?._id === user._id;
    const isFollowing = currentUser?.following?.includes(user._id);
    // --- START: FIX FOR SUBSCRIPTION CHECK ---
    // This now correctly checks if the subscription ID (sub.user) exists in your list.
    const isSubscribed = currentUser?.goldenSubscriptions?.some(sub => sub.user === user._id);
    // --- END: FIX ----
    const avatarBorder = user.isGoldenMember ? 'border-yellow-400' : 'border-green-500';

    return (
        <>
            <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
            <BadgeInfoModal isOpen={isBadgeInfoOpen} onClose={() => setIsBadgeInfoOpen(false)} />
            <GoldenMemberModal isOpen={isGoldenModalOpen} onClose={() => setIsGoldenModalOpen(false)} user={user} onUpdate={fetchData} />
            <JoinGoldenModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} goldenMember={user} onUpdate={fetchData} />
            <GoldenPostForm isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} onPostCreated={fetchData} />

            <div className="animate-fade-in max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-gray-800 p-6 rounded-lg mb-8">
                    <img src={user.avatar || `https://avatar.iran.liara.run/public/boy?username=${user._id}`} alt="avatar" className={`w-24 h-24 rounded-full border-4 ${avatarBorder} transition-colors`} />
                    <div className="flex-grow text-center sm:text-left">
                        <h1 className="text-4xl font-bold text-white">{user.username}</h1>
                        <p className="text-gray-500 text-sm mt-1">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
                        <div className="flex items-center justify-center sm:justify-start gap-4 mt-2">
                            <p className="text-gray-400">{user.about || "No bio provided."}</p>
                            {user.xLink && (<a href={user.xLink} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg></a>)}
                            {user.youtubeLink && (<a href={user.youtubeLink} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993z" /></svg></a>)}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2">
                            <Link to={`/profile/${userId}/followers`} className="text-sm text-gray-400 hover:underline">
                                <span className="font-bold text-white">{followersCount}</span> Followers
                            </Link>
                            <Link to={`/profile/${userId}/followers`} state={{ activeTab: 'Following' }} className="text-sm text-gray-400 hover:underline">
                                <span className="font-bold text-white">{followingCount}</span> Following
                            </Link>

                            {/* --- FIX: Links are now conditional based on isOwnProfile --- */}
                            {isOwnProfile && user.isGoldenMember && (
                                <Link to={`/profile/${userId}/followers`} state={{ activeTab: 'Subscribers' }} className="text-sm text-yellow-400 hover:underline">
                                    <span className="font-bold text-white">{goldenSubscribersCount}</span> Subscribers
                                </Link>
                            )}
                            {isOwnProfile && (
                                <Link to={`/profile/${userId}/followers`} state={{ activeTab: 'Subscriptions' }} className="text-sm text-yellow-400 hover:underline">
                                    <span className="font-bold text-white">{goldenSubscriptionsCount}</span> Subscriptions
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="w-full sm:w-auto flex flex-col items-center sm:items-end gap-3 mt-4 sm:mt-0">
                        {currentUser && !isOwnProfile && (
                            <div className="flex gap-3">
                                {isSubscribed ? (
                                    // If already subscribed, just show the "Subscribed" badge
                                    <div className="font-bold py-2 px-5 rounded-md bg-gray-700 text-yellow-400 border border-yellow-500 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                        Subscribed
                                    </div>
                                ) : user.isGoldenMember ? (
                                    user.acceptingNewSubscribers ? (
                                        // If not subscribed AND they are accepting, show the "Join" button
                                        <button onClick={() => setIsJoinModalOpen(true)} className="font-bold py-2 px-5 rounded-md bg-yellow-500 text-black hover:bg-yellow-400">
                                            Join (${user.goldenMemberPrice}/mo)
                                        </button>
                                    ) : (
                                        // If not subscribed AND they are paused, show the disabled button
                                        <button disabled className="font-bold py-2 px-5 rounded-md bg-gray-700 text-gray-400 cursor-not-allowed">
                                            Subscriptions Paused
                                        </button>
                                    )
                                ) : null}

                                {isFollowing ? (<button onClick={handleUnfollow} className="bg-gray-700 text-white font-bold py-2 px-5 rounded-md hover:bg-red-600">Following</button>) : (<button onClick={handleFollow} className="bg-blue-600 text-white font-bold py-2 px-5 rounded-md hover:bg-blue-700">Follow</button>)}
                                {/* --- END: CORRECTED BUTTON LOGIC --- */}
                            </div>
                        )}
                        {isOwnProfile && (
                            <div className="flex gap-3">
                                <button onClick={() => setIsGoldenModalOpen(true)} className="font-bold py-2 px-5 rounded-md bg-yellow-500 text-black hover:bg-yellow-400">{user.isGoldenMember ? 'Manage Gold' : 'Become Golden'}</button>
                                <Link to="/profile/edit" className="bg-gray-700 text-white font-bold py-2 px-5 rounded-md hover:bg-gray-600">Edit Profile</Link>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard label="Overall Rank" value={performance.overallRank} isRank={true} />
                    <StatCard label="Average Score" value={performance.overallAccuracy.toFixed(1)} />
                    <StatCard label="Total Points" value={user.score} />
                    <StatCard label="Total Predictions" value={predictions.length} />
                </div>

                <div className="flex border-b border-gray-700 mb-8">
                    <button onClick={() => setActiveTab('Profile')} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'Profile' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>Profile</button>
                    {user.isGoldenMember && (<button onClick={() => setActiveTab('GoldenFeed')} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'GoldenFeed' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-yellow-600 hover:text-yellow-400'}`}>Golden Feed</button>)}
                </div>

                {activeTab === 'Profile' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <WatchlistShowcase stocks={watchlistQuotes} />
                            <BadgeShowcase badges={user.badges} onBadgeClick={setSelectedBadge} onInfoClick={() => setIsBadgeInfoOpen(true)} />
                            <PerformanceTabs performance={performance} />
                            <PerformanceChart chartData={chartData} />
                        </div>
                        <div className="lg:col-span-1 space-y-8 self-start">
                            <div className="bg-gray-800 p-6 rounded-lg"><h3 className="text-xl font-bold text-white mb-4">Active Predictions</h3>{activePredictions.length > 0 ? (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">{activePredictions.slice(0, visibleActive).map(p => <MiniPredictionCard key={p._id} prediction={p} currentPrice={activePredictionQuotes[p.stockTicker]} />)}</div>) : <p className="text-gray-500 text-center py-4">No active predictions.</p>}{activePredictions.length > visibleActive && (<button onClick={() => setVisibleActive(prev => prev + 6)} className="w-full mt-4 bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600">Load More</button>)}</div>
                            <div className="bg-gray-800 p-6 rounded-lg"><h3 className="text-xl font-bold text-white mb-4">Prediction History</h3>{assessedPredictions.length > 0 ? (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">{assessedPredictions.slice(0, visiblePredictions).map(p => <MiniPredictionCard key={p._id} prediction={p} />)}</div>) : <p className="text-gray-500 text-center py-4">No prediction history yet.</p>}{assessedPredictions.length > visiblePredictions && (<button onClick={() => setVisiblePredictions(prev => prev + 6)} className="w-full mt-4 bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600">Load More</button>)}</div>
                        </div>
                    </div>
                )}

                {activeTab === 'GoldenFeed' && (
                    <div>
                        {isOwnProfile && (
                            <div className="flex justify-end mb-4">
                                <button onClick={() => setIsPostModalOpen(true)} className="bg-yellow-500 text-black font-bold py-2 px-4 rounded-md hover:bg-yellow-400">Create Golden Post</button>
                            </div>
                        )}
                        <GoldenFeed
                            profileUser={user}
                            onJoinClick={() => setIsJoinModalOpen(true)}
                        />
                    </div>
                )}
            </div>
        </>
    );
};

export default ProfilePage;