// src/pages/FollowersPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';
import VerifiedTick from '../components/VerifiedTick';
import { useTranslation } from 'react-i18next';

// UserCard component remains the same
const UserCard = ({ user, onCancel, isSubscription, showDate, settings }) => {
    const { t } = useTranslation();
    return (
        <div className="bg-gray-800 p-4 rounded-lg transition-all duration-300 hover:shadow-lg hover:bg-gray-700 flex flex-col items-center text-center">
            <Link to={`/profile/${user._id}`}>
                <img
                    src={user.avatar || `https://avatar.iran.liara.run/public/boy?username=${user._id}`}
                    alt={t('followers_avatar_alt')}
                    className={`w-20 h-20 rounded-full border-4 ${user.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`}
                />
            </Link>
            <div className="mt-3 text-lg font-bold text-white">
                <Link to={`/profile/${user._id}`} className="hover:underline">{user.username}</Link>
                {settings?.isVerificationEnabled && user.isVerified && (
                    <div className="inline-block align-middle ml-1">
                        <VerifiedTick />
                    </div>
                )}
            </div>
            <div className="text-sm text-gray-400 mt-1">
                {t('followers_avg_score')}: <span className="font-bold text-green-400">{user.avgScore || 0}</span>
            </div>
            {showDate && user.subscribedAt && (
                <div className="text-xs text-gray-500 mt-2">
                    {t('followers_subscribed_on', { date: new Date(user.subscribedAt).toLocaleDateString() })}
                </div>
            )}
            {isSubscription && (
                <button
                    onClick={() => onCancel(user)}
                    className="w-full mt-auto pt-3 text-red-500 text-xs font-bold hover:underline"
                >
                    {t('followers_cancel_subscription')}
                </button>
            )}
        </div>
    );
};


const FollowersPage = ({ settings }) => {
    const { t } = useTranslation();
    const { userId } = useParams();
    const location = useLocation();
    const [userData, setUserData] = useState({ followers: [], following: [], goldenSubscribers: [], goldenSubscriptions: [] });
    const [profileUser, setProfileUser] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userToUnsubscribe, setUserToUnsubscribe] = useState(null);

    // MODIFIED: Default to the 'Followers' key. This now works perfectly with the Link state.
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'Followers');

    const fetchFollowData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/${userId}/follow-data-extended`, { withCredentials: true });
            setUserData(response.data);
            setProfileUser(response.data.profileUser);
        } catch (err) {
            toast.error(t("followers_error_load_users"));
        } finally {
            setLoading(false);
        }
    }, [userId, t]);

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true })
            .then(res => setCurrentUser(res.data));
        fetchFollowData();
    }, [fetchFollowData]);
    
    // Unchanged functions (handleCancelClick, handleConfirmCancel)
    const handleCancelClick = (user) => { setUserToUnsubscribe(user); setIsModalOpen(true); };
    const handleConfirmCancel = () => { if (!userToUnsubscribe) return; axios.post(/*...unchanged...*/); };

    const isOwnProfile = currentUser?._id === userId;

    // MODIFIED: The `tabs` array now has a `key` for logic and a `name` for display.
    const tabs = [
        { key: 'Followers', name: t("followers_tab_followers"), count: userData.followers.length, data: userData.followers },
        { key: 'Following', name: t("followers_tab_following"), count: userData.following.length, data: userData.following },
        ...(isOwnProfile && profileUser?.isGoldenMember ? [{ key: 'Subscribers', name: t("followers_tab_subscribers"), count: userData.goldenSubscribers.length, data: userData.goldenSubscribers, isGolden: true }] : []),
        ...(isOwnProfile ? [{ key: 'Subscriptions', name: t("followers_tab_subscriptions"), count: userData.goldenSubscriptions.length, data: userData.goldenSubscriptions, isGolden: true }] : []),
    ];

    const currentTabData = tabs.find(tab => tab.key === activeTab)?.data || [];

    if (loading) return <div className="text-center text-white mt-10">{t("followers_loading")}</div>;

    return (
        <>
            <ConfirmationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={handleConfirmCancel} title={t("followers_confirm_cancel_title")} message={t("followers_confirm_cancel_message", { username: userToUnsubscribe?.username })} />
            <div className="max-w-5xl mx-auto animate-fade-in px-4">
                <div className="flex justify-center border-b border-gray-700 mb-8 flex-wrap">
                    {tabs.map(tab => {
                        // MODIFIED: `isActive` now correctly compares keys.
                        const isActive = activeTab === tab.key;
                        const isGolden = tab.isGolden;
                        let activeClasses = 'text-green-400 border-green-400';
                        let inactiveClasses = 'text-gray-400 hover:text-white';
                        if (isGolden) {
                            activeClasses = 'text-yellow-400 border-yellow-400';
                            inactiveClasses = 'text-yellow-600 hover:text-yellow-400';
                        }
                        return (
                            <button
                                key={tab.key}
                                // MODIFIED: `onClick` now sets the active tab using the key.
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-2 font-bold transition-colors border-b-2 ${isActive ? activeClasses : `${inactiveClasses} border-transparent`}`}
                            >
                                {tab.name} ({tab.count})
                            </button>
                        );
                    })}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {currentTabData.length > 0 ? currentTabData.map(item => (
                        <UserCard
                            key={item._id}
                            user={item}
                            settings={settings}
                            // MODIFIED: Logic now correctly uses non-translated keys.
                            isSubscription={activeTab === 'Subscriptions'}
                            showDate={activeTab === 'Subscriptions' || activeTab === 'Subscribers'}
                            onCancel={handleCancelClick}
                        />
                    )) : <p className="col-span-full text-gray-500 text-center py-8">{t("followers_no_users")}</p>}
                </div>
            </div>
        </>
    );
};

export default FollowersPage;