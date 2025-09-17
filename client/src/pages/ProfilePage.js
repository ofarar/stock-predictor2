import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import PerformanceChart from '../components/PerformanceChart';
import toast from 'react-hot-toast'; // 1. Import toast

// Helper component for the stat cards
const StatCard = ({ label, value }) => (
    <div className="bg-gray-700 p-4 rounded-lg text-center">
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
    </div>
);

// Helper component for the performance tabs
const PerformanceTabs = ({ performance }) => {
    const [activeTab, setActiveTab] = useState('ByType');

    if (!performance) return null;

    return (
        <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex border-b border-gray-700 mb-4">
                <button onClick={() => setActiveTab('ByType')} className={`px-4 py-2 font-bold ${activeTab === 'ByType' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>By Type</button>
                <button onClick={() => setActiveTab('ByStock')} className={`px-4 py-2 font-bold ${activeTab === 'ByStock' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>By Stock</button>
            </div>
            {activeTab === 'ByType' && (
                <div className="space-y-2">
                    {performance.byType?.length > 0 ? performance.byType.map(p => (
                        <div key={p.type} className="flex justify-between text-sm p-2 bg-gray-700 rounded">
                            <span className="font-bold text-gray-300">{p.type}</span>
                            <div><span className="text-gray-400">Acc:</span> {p.accuracy} | <span className="text-gray-400">Rank:</span> {p.rank}</div>
                        </div>
                    )) : <p className="text-gray-500">No assessed predictions of this type.</p>}
                </div>
            )}
            {activeTab === 'ByStock' && (
                <div className="space-y-2">
                    {performance.byStock?.length > 0 ? performance.byStock.map(s => (
                        <div key={s.ticker} className="flex justify-between text-sm p-2 bg-gray-700 rounded">
                            <span className="font-bold text-gray-300">{s.ticker}</span>
                            <div><span className="text-gray-400">Rank:</span> {s.rank} | <span className="text-gray-400">Acc:</span> {s.accuracy}</div>
                        </div>
                    )) : <p className="text-gray-500">No assessed predictions for any stock yet.</p>}
                </div>
            )}
        </div>
    );
};


const ProfilePage = () => {
    const { userId } = useParams();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const profileRes = await axios.get(`${process.env.REACT_APP_API_URL}/api/profile/${userId}`);
                const currentUserRes = await axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true });
                setProfileData(profileRes.data);
                setCurrentUser(currentUserRes.data);
            } catch (error) {
                console.error("Failed to fetch profile data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId]);

    if (loading) return <div className="text-center text-white mt-10">Loading profile...</div>;
    if (!profileData) return <div className="text-center text-white mt-10">User not found.</div>;

    const { user, predictions, performance, followersCount, followingCount } = profileData;
    const activePredictions = predictions.filter(p => p.status === 'Active');
    const isOwnProfile = currentUser?._id === user._id;
    const isFollowing = currentUser?.following?.includes(user._id);

    const handleFollow = () => {
        axios.post(`${process.env.REACT_APP_API_URL}/api/users/${userId}/follow`, {}, { withCredentials: true })
            .then(() => {
                // --- Start: Update the local state immediately ---
                // 1. Update the 'isFollowing' status for the button
                setCurrentUser(prevUser => ({
                    ...prevUser,
                    following: [...prevUser.following, userId]
                }));

                // 2. Update the follower count on the page
                setProfileData(prevData => ({
                    ...prevData,
                    followersCount: prevData.followersCount + 1
                }));
                // --- End: Update the local state ---
            })
            .catch(err => {
                toast.error("Failed to follow user.");
            });
    };

    return (
        <div className="animate-fade-in max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center gap-6 bg-gray-800 p-6 rounded-lg mb-8">
                <img src={user.avatar || `https://avatar.iran.liara.run/public/boy?username=${user._id}`} alt="avatar" className="w-24 h-24 rounded-full" />
                <div className="flex-grow text-center sm:text-left">
                    <h1 className="text-4xl font-bold text-white">{user.username}</h1>
                    {/* --- Member Since Date Added Here --- */}
                    <p className="text-gray-500 text-sm mt-1">
                        Member since {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-gray-400 mt-2">{user.about || "No bio provided."}</p>
                    <div className="mt-4 flex items-center justify-center sm:justify-start space-x-4">
                        <Link to={`/profile/${userId}/followers`} className="text-sm text-gray-400 hover:underline">
                            <span className="font-bold text-white">{followersCount || 0}</span> Followers
                        </Link>
                        <Link to={`/profile/${userId}/followers`} className="text-sm text-gray-400 hover:underline">
                            <span className="font-bold text-white">{followingCount || 0}</span> Following
                        </Link>
                    </div>
                </div>
                <div className="ml-auto mt-4 sm:mt-0">
                    {currentUser && !isOwnProfile && (
                        isFollowing ? (
                            <button className="bg-gray-700 text-white font-bold py-2 px-4 rounded-md cursor-not-allowed">Following</button>
                        ) : (
                            <button onClick={handleFollow} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md">Follow</button>
                        )
                    )}
                    {isOwnProfile && <Link to="/profile/edit" className="bg-gray-700 px-4 py-2 rounded-md">Edit Profile</Link>}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard label="Overall Rank" value={performance?.overallRank || 'N/A'} />
                <StatCard label="Overall Accuracy" value={`${performance?.overallAccuracy || 0}%`} />
                <StatCard label="Total Points" value={user.score || 0} />
                <StatCard label="Total Predictions" value={predictions.length} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <PerformanceTabs performance={performance} />
                </div>
                <div className="lg:col-span-1">
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-bold text-white mb-4">Active Predictions</h3>
                        <div className="space-y-3">
                            {activePredictions.length > 0 ? activePredictions.map(p => (
                                <div key={p._id} className="flex justify-between items-center text-sm p-2 bg-gray-700 rounded">
                                    <span className="font-bold text-white">{p.stockTicker}</span>
                                    <span className="text-gray-400">{p.predictionType}</span>
                                    <span className="text-gray-300">${p.targetPrice.toFixed(2)}</span>
                                </div>
                            )) : <p className="text-gray-500">No active predictions.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;