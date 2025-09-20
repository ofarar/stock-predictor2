import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import PerformanceChart from '../components/PerformanceChart';
import PerformanceTabs from '../components/PerformanceTabs';
import GoldenMemberModal from '../components/GoldenMemberModal';
import JoinGoldenModal from '../components/JoinGoldenModal';

// Helper component for the stat cards
const StatCard = ({ label, value }) => (
    <div className="bg-gray-800 p-4 rounded-lg text-center">
        <p className="text-gray-400 text-sm font-medium">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
    </div>
);

const ProfilePage = () => {
    const { userId } = useParams();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [isGoldenModalOpen, setIsGoldenModalOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [visiblePredictions, setVisiblePredictions] = useState(5);
    const [visibleActive, setVisibleActive] = useState(5); // New state for active predictions pagination

    // THE FIX IS HERE: The logic is simplified to remove the 'profileData' dependency.
    const fetchData = useCallback(async () => {
        setLoading(true); // Always set loading before a fetch.
        try {
            const [profileRes, currentUserRes] = await Promise.all([
                axios.get(`${process.env.REACT_APP_API_URL}/api/profile/${userId}`),
                axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true })
            ]);
            setProfileData(profileRes.data);
            setCurrentUser(currentUserRes.data);
        } catch (error) {
            console.error("Failed to fetch profile data:", error);
            toast.error("Could not load profile.");
        } finally {
            setLoading(false);
        }
    }, [userId]); // Now, the only dependency is 'userId', which is correct.

    useEffect(() => {
        fetchData();
    }, [fetchData]); // This now correctly and safely depends on 'fetchData'.

    const handleFollow = () => {
        axios.post(`${process.env.REACT_APP_API_URL}/api/users/${userId}/follow`, {}, { withCredentials: true })
            .then(() => fetchData());
    };

    const handleUnfollow = () => {
        axios.post(`${process.env.REACT_APP_API_URL}/api/users/${userId}/unfollow`, {}, { withCredentials: true })
            .then(() => fetchData());
    };

    if (loading) return <div className="text-center text-white mt-10">Loading profile...</div>;
    if (!profileData) return <div className="text-center text-white mt-10">User not found.</div>;

    const { user, predictions, performance, followersCount, followingCount, chartData } = profileData;
    const activePredictions = predictions.filter(p => p.status === 'Active');
    const assessedPredictions = predictions.filter(p => p.status === 'Assessed');

    const isOwnProfile = currentUser?._id === user._id;
    const isFollowing = currentUser?.following?.includes(user._id);
    const isSubscribed = currentUser?.goldenSubscriptions?.includes(user._id);
    const avatarBorder = user.isGoldenMember ? 'border-yellow-400' : 'border-green-500';

    return (
        <>
            <GoldenMemberModal
                isOpen={isGoldenModalOpen}
                onClose={() => setIsGoldenModalOpen(false)}
                user={user}
                onUpdate={fetchData}
            />
            <JoinGoldenModal
                isOpen={isJoinModalOpen}
                onClose={() => setIsJoinModalOpen(false)}
                goldenMember={user}
                onUpdate={fetchData}
            />

            <div className="animate-fade-in max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row items-center gap-6 bg-gray-800 p-6 rounded-lg mb-8">
                    <img src={user.avatar || `https://avatar.iran.liara.run/public/boy?username=${user._id}`} alt="avatar" className={`w-24 h-24 rounded-full border-4 ${avatarBorder} transition-colors`} />
                    <div className="flex-grow text-center sm:text-left">
                        <h1 className="text-4xl font-bold text-white">{user.username}</h1>
                        <p className="text-gray-500 text-sm mt-1">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
                        <p className="text-gray-400 mt-2">{user.about || "No bio provided."}</p>
                        <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2">
                            <Link to={`/profile/${userId}/followers`} className="text-sm text-gray-400 hover:underline"><span className="font-bold text-white">{followersCount}</span> Followers</Link>
                            <Link to={`/profile/${userId}/followers`} state={{ activeTab: 'Following' }} className="text-sm text-gray-400 hover:underline"><span className="font-bold text-white">{followingCount}</span> Following</Link>
                            {user.isGoldenMember && (
                                <Link to={`/profile/${userId}/followers`} state={{ activeTab: 'Subscribers' }} className="text-sm text-yellow-400 hover:underline"><span className="font-bold text-white">{profileData.goldenSubscribersCount}</span> Subscribers</Link>
                            )}
                            <Link to={`/profile/${userId}/followers`} state={{ activeTab: 'Subscriptions' }} className="text-sm text-yellow-400 hover:underline"><span className="font-bold text-white">{profileData.goldenSubscriptionsCount}</span> Subscriptions</Link>
                        </div>
                    </div>

                    <div className="w-full sm:w-auto flex flex-col items-center sm:items-end gap-3 mt-4 sm:mt-0">
                        {currentUser && !isOwnProfile && (
                            <div className="flex gap-3">
                                {user.isGoldenMember && !isSubscribed && (
                                    <button onClick={() => setIsJoinModalOpen(true)} className="font-bold py-2 px-5 rounded-md bg-yellow-500 text-black hover:bg-yellow-400 transition-transform hover:scale-105">
                                        Join (${user.goldenMemberPrice}/mo)
                                    </button>
                                )}
                                {isSubscribed && (
                                    <div className="font-bold py-2 px-5 rounded-md bg-gray-700 text-yellow-400 border border-yellow-500 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                        Subscribed
                                    </div>
                                )}
                                {isFollowing ? (
                                    <button onClick={handleUnfollow} className="bg-gray-700 text-white font-bold py-2 px-5 rounded-md hover:bg-red-600">Following</button>
                                ) : (
                                    <button onClick={handleFollow} className="bg-blue-600 text-white font-bold py-2 px-5 rounded-md hover:bg-blue-700">Follow</button>
                                )}
                            </div>
                        )}
                        {isOwnProfile && (
                            <div className="flex gap-3">
                                <button onClick={() => setIsGoldenModalOpen(true)} className="font-bold py-2 px-5 rounded-md bg-yellow-500 text-black hover:bg-yellow-400 transition-transform hover:scale-105">
                                    {user.isGoldenMember ? 'Manage Gold' : 'Become Golden'}
                                </button>
                                <Link to="/profile/edit" className="bg-gray-700 text-white font-bold py-2 px-5 rounded-md hover:bg-gray-600">Edit Profile</Link>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard label="Overall Rank" value={performance.overallRank} />
                    <StatCard
                        label="Average Score"
                        value={performance.overallAccuracy.toFixed(1)}
                    />
                    <StatCard label="Total Points" value={user.score} />
                    <StatCard label="Total Predictions" value={predictions.length} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <PerformanceTabs performance={performance} />
                        <PerformanceChart chartData={chartData} />
                    </div>
                    <div className="lg:col-span-1 space-y-8 self-start">
                        {/* Active Predictions Section with Show More */}
                        <div className="bg-gray-800 p-6 rounded-lg">
                            <h3 className="text-xl font-bold text-white mb-4">Active Predictions</h3>
                            <div className="space-y-3">
                                {activePredictions.length > 0 ? activePredictions.slice(0, visibleActive).map(p => (
                                    <Link to={`/prediction/${p._id}`} key={p._id} className="block bg-gray-700 p-3 rounded-lg hover:bg-gray-600">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-bold text-white">{p.stockTicker}</span>
                                            <span className="text-gray-400">{p.predictionType}</span>
                                            <span className="text-gray-300">${p.targetPrice.toFixed(2)}</span>
                                        </div>
                                    </Link>
                                )) : <p className="text-gray-500 text-center py-4">No active predictions.</p>}
                            </div>
                            {activePredictions.length > visibleActive && (
                                <button onClick={() => setVisibleActive(prev => prev + 5)} className="w-full mt-4 bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600">
                                    Load More
                                </button>
                            )}
                        </div>

                        <div className="bg-gray-800 p-6 rounded-lg">
                            <h3 className="text-xl font-bold text-white mb-4">Prediction History</h3>
                            <div className="space-y-3">
                                {assessedPredictions.length > 0 ? (
                                    assessedPredictions.slice(0, visiblePredictions).map(p => (
                                        <Link to={`/prediction/${p._id}`} key={p._id} className="block bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition-colors">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-bold text-white">{p.stockTicker}</span>
                                                <span className="text-gray-400">{p.predictionType}</span>
                                                <span className={`font-bold ${p.score > 60 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {p.score} pts
                                                </span>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-4">No prediction history yet.</p>
                                )}
                            </div>
                            {assessedPredictions.length > visiblePredictions && (
                                <button onClick={() => setVisiblePredictions(prev => prev + 5)} className="w-full mt-4 bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600">
                                    Load More
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProfilePage;