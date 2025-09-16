import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

// --- Dummy Data for Demonstration ---
const dummyFollowData = {
    followers: [
        { _id: 'user2', username: 'JaneDoe', avatar: 'https://avatar.iran.liara.run/public/girl?username=JaneDoe', about: 'Focusing on blue-chip stocks.' },
        { _id: 'user3', username: 'StockSensei', avatar: 'https://avatar.iran.liara.run/public/boy?username=StockSensei', about: 'Technical analysis expert.' },
        { _id: 'user4', username: 'CryptoKing', avatar: 'https://avatar.iran.liara.run/public/boy?username=CryptoKing', about: 'All things crypto.' },
    ],
    following: [
        { _id: 'user5', username: 'ValueInvestor', avatar: 'https://avatar.iran.liara.run/public/boy?username=ValueInvestor', about: 'Looking for long-term value.' },
    ]
};

const FollowersPage = () => {
    const { userId } = useParams();
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);
    const [activeTab, setActiveTab] = useState('Followers'); // 'Followers' or 'Following'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app, you'd fetch this from a dedicated API route based on userId
        setFollowers(dummyFollowData.followers);
        setFollowing(dummyFollowData.following);
        setLoading(false);
    }, [userId]);

    const listToDisplay = activeTab === 'Followers' ? followers : following;

    if (loading) return <div className="text-center text-white">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-6">Followers & Following</h1>
            
            <div className="flex border-b border-gray-700 mb-6">
                <button 
                    onClick={() => setActiveTab('Followers')} 
                    className={`px-4 py-2 font-bold ${activeTab === 'Followers' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}
                >
                    Followers ({followers.length})
                </button>
                <button 
                    onClick={() => setActiveTab('Following')} 
                    className={`px-4 py-2 font-bold ${activeTab === 'Following' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}
                >
                    Following ({following.length})
                </button>
            </div>
            
            <div className="space-y-4">
                {listToDisplay.length > 0 ? listToDisplay.map(user => (
                    <Link to={`/profile/${user._id}`} key={user._id} className="flex items-center bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors">
                        <img src={user.avatar} alt="avatar" className="w-12 h-12 rounded-full" />
                        <div className="ml-4">
                            <p className="font-bold text-white">{user.username}</p>
                            <p className="text-sm text-gray-400">{user.about}</p>
                        </div>
                        {/* A follow/unfollow button could go here in a future version */}
                    </Link>
                )) : (
                    <p className="text-gray-500 text-center py-8">No users to display.</p>
                )}
            </div>
        </div>
    );
};

export default FollowersPage;