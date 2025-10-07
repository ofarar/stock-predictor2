import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';

// Redesigned, more compact User Card
const UserCard = ({ user, onCancel, isSubscription }) => (
    <div className={`relative bg-gray-800 p-4 rounded-lg transition-all duration-300 hover:shadow-lg hover:bg-gray-700 flex flex-col items-center text-center`}>
        {user.isGoldenMember && isSubscription && (
             <div className="absolute top-2 right-2 text-yellow-400" title="Golden Member">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
            </div>
        )}
        <Link to={`/profile/${user._id}`}>
            <img 
                src={user.avatar || `https://avatar.iran.liara.run/public/boy?username=${user._id}`} 
                alt="avatar" 
                className={`w-20 h-20 rounded-full border-4 ${user.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`} 
            />
        </Link>
        <Link to={`/profile/${user._id}`} className="font-bold text-white text-lg hover:underline mt-3">{user.username}</Link>
        <div className="text-sm text-gray-400 mt-1">
            Avg Score: <span className="font-bold text-green-400">{user.avgScore || 0}</span>
        </div>
        {isSubscription && (
            <button 
                onClick={() => onCancel(user)}
                className="w-full mt-4 bg-red-600 text-white text-xs font-bold py-2 px-3 rounded-md hover:bg-red-700"
            >
                Cancel Subscription
            </button>
        )}
    </div>
);


const FollowersPage = () => {
    const { userId } = useParams();
    const location = useLocation();
    const [userData, setUserData] = useState({ 
        followers: [], 
        following: [], 
        goldenSubscribers: [], 
        goldenSubscriptions: [] 
    });
    const [profileUser, setProfileUser] = useState(null);
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'Followers');
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userToUnsubscribe, setUserToUnsubscribe] = useState(null);

    const fetchFollowData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/${userId}/follow-data-extended`);
            setUserData(response.data);
            setProfileUser(response.data.profileUser);
        } catch (err) {
            console.error("Failed to fetch data:", err);
            toast.error("Could not load user lists.");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchFollowData();
    }, [fetchFollowData]);

    const handleCancelClick = (user) => {
        setUserToUnsubscribe(user);
        setIsModalOpen(true);
    };

    const handleConfirmCancel = () => {
        if (!userToUnsubscribe) return;

        axios.post(`${process.env.REACT_APP_API_URL}/api/users/${userToUnsubscribe._id}/cancel-golden`, {}, { withCredentials: true })
            .then(() => {
                toast.success(`Subscription to ${userToUnsubscribe.username} canceled.`);
                fetchFollowData();
            })
            .catch(() => toast.error("Failed to cancel subscription."))
            .finally(() => {
                setIsModalOpen(false);
                setUserToUnsubscribe(null);
            });
    };

    const tabs = [
        { name: 'Followers', count: userData.followers.length, data: userData.followers },
        { name: 'Following', count: userData.following.length, data: userData.following },
        ...(profileUser?.isGoldenMember ? [{ name: 'Subscribers', count: userData.goldenSubscribers.length, data: userData.goldenSubscribers, isGolden: true }] : []),
        { name: 'Subscriptions', count: userData.goldenSubscriptions.length, data: userData.goldenSubscriptions, isGolden: true },
    ];

    const currentTabData = tabs.find(tab => tab.name === activeTab)?.data || [];

    if (loading) return <div className="text-center text-white mt-10">Loading...</div>;

    return (
        <>
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirmCancel}
                title="Cancel Subscription"
                message={`Are you sure you want to cancel your subscription to ${userToUnsubscribe?.username}?`}
            />

            <div className="max-w-5xl mx-auto animate-fade-in px-4">
                <div className="flex justify-center border-b border-gray-700 mb-8 flex-wrap">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.name;
                        const isGolden = tab.isGolden;
                        let activeClasses = 'text-green-400 border-green-400';
                        let inactiveClasses = 'text-gray-400 hover:text-white';

                        if (isGolden) {
                            activeClasses = 'text-yellow-400 border-yellow-400';
                            inactiveClasses = 'text-yellow-600 hover:text-yellow-400';
                        }

                        return (
                            <button 
                                key={tab.name} 
                                onClick={() => setActiveTab(tab.name)}
                                className={`px-4 py-2 font-bold transition-colors border-b-2 ${isActive ? activeClasses : `${inactiveClasses} border-transparent`}`}
                            >
                                {tab.name} ({tab.count})
                            </button>
                        );
                    })}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {currentTabData.length > 0 ? currentTabData.map(user => (
                        <UserCard
                            key={user._id}
                            user={user}
                            isSubscription={activeTab === 'Subscriptions'}
                            onCancel={handleCancelClick}
                        />
                    )) : <p className="col-span-full text-gray-500 text-center py-8">No users to display in this list.</p>}
                </div>
            </div>
        </>
    );
};

export default FollowersPage;