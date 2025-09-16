import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const FollowersPage = () => {
    const { userId } = useParams();
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);
    const [activeTab, setActiveTab] = useState('Followers');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchFollowData = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/${userId}/follow-data`);
                setFollowers(response.data.followers);
                setFollowing(response.data.following);
            } catch (err) {
                console.error("Failed to fetch follow data:", err);
                setError("Could not load user lists.");
            } finally {
                setLoading(false);
            }
        };

        fetchFollowData();
    }, [userId]);

    const listToDisplay = activeTab === 'Followers' ? followers : following;

    if (loading) return <div className="text-center text-white mt-10">Loading...</div>;
    if (error) return <div className="text-center text-red-400 mt-10">{error}</div>;

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold text-white mb-6">Followers & Following</h1>
            
            <div className="flex border-b border-gray-700 mb-6">
                <button 
                    onClick={() => setActiveTab('Followers')} 
                    className={`px-4 py-2 font-bold transition-colors ${activeTab === 'Followers' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}
                >
                    Followers ({followers.length})
                </button>
                <button 
                    onClick={() => setActiveTab('Following')} 
                    className={`px-4 py-2 font-bold transition-colors ${activeTab === 'Following' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}
                >
                    Following ({following.length})
                </button>
            </div>
            
            <div className="space-y-4">
                {listToDisplay.length > 0 ? listToDisplay.map(user => (
                    <Link to={`/profile/${user._id}`} key={user._id} className="flex items-center bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors">
                        <img src={user.avatar || `https://avatar.iran.liara.run/public/boy?username=${user._id}`} alt="avatar" className="w-12 h-12 rounded-full" />
                        <div className="ml-4">
                            <p className="font-bold text-white">{user.username}</p>
                            <p className="text-sm text-gray-400">{user.about}</p>
                        </div>
                    </Link>
                )) : (
                    <p className="text-gray-500 text-center py-8">No users to display in this list.</p>
                )}
            </div>
        </div>
    );
};

export default FollowersPage;