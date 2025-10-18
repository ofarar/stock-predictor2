// src/pages/FollowersPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';
import VerifiedTick from '../components/VerifiedTick';
import { useTranslation } from 'react-i18next';
import { formatNumericDate } from '../utils/formatters';
import FindMemberWizardTrigger from '../components/FindMemberWizardTrigger';
import RecommendationWizard from '../components/RecommendationWizard';
import UserCard from '../components/UserCard'; // Import the new UserCard component


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
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    // MODIFIED: Default to the 'Followers' key. This now works perfectly with the Link state.
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'Followers');

    const handleFollow = (userIdToFollow) => {
        // Prevent following oneself
        if (currentUser?._id === userIdToFollow) return;

        // Keep copies of the current state in case we need to revert
        const originalUserData = JSON.parse(JSON.stringify(userData)); // Deep copy
        const originalCurrentUser = JSON.parse(JSON.stringify(currentUser)); // Deep copy

        // --- Optimistic UI Update ---
        // 1. Update the currentUser state (this controls the button display on *all* tabs)
        //    Adding the ID to currentUser.following ensures the 'Unfollow' button appears.
        setCurrentUser((prevUser) => ({
            ...prevUser,
            // Ensure 'following' exists before spreading, add the new ID
            following: [...(prevUser?.following || []), userIdToFollow]
        }));

        // 2. Optionally, update the main list data if you want the user card
        //    to immediately appear in the 'Following' tab upon switching.
        //    This requires finding the user details from the 'followers' list first.
        const userToAddToFollowingList = originalUserData.followers.find(user => user._id === userIdToFollow);
        if (userToAddToFollowingList) {
            setUserData(prev => ({
                ...prev,
                // Add the followed user's data to the 'following' list state
                following: [...prev.following, userToAddToFollowingList]
            }));
        }
        // --- End Optimistic Update ---


        // API Call
        const promise = axios.post(`${process.env.REACT_APP_API_URL}/api/users/${userIdToFollow}/follow`, {}, { withCredentials: true });

        toast.promise(promise, {
            loading: t('watchlistPage.toast.loadingFollow'), // Reusing existing translation
            success: (res) => {
                // Success! The optimistic update was correct.
                // Optional background refresh:
                // fetchFollowData();
                return t('watchlistPage.toast.successFollow'); // Reusing existing translation
            },
            error: (err) => {
                // API call failed. Revert the optimistic UI updates.
                setUserData(originalUserData);
                setCurrentUser(originalCurrentUser);
                return t('watchlistPage.toast.errorFollow'); // Reusing existing translation
            }
        });
    };

    const handleUnfollow = (userIdToUnfollow) => {
        // Keep copies of the current state in case we need to revert
        const originalUserData = JSON.parse(JSON.stringify(userData)); // Deep copy needed
        const originalCurrentUser = JSON.parse(JSON.stringify(currentUser)); // Deep copy

        // --- Optimistic UI Update ---
        // 1. Update the main list data (removes card from 'Following' tab)
        setUserData(prev => ({
            ...prev,
            following: prev.following.filter(user => user._id !== userIdToUnfollow)
        }));

        // 2. Update the currentUser state (this controls the button display on *all* tabs)
        //    Removing the ID from currentUser.following ensures the 'Follow' button appears
        //    if this user is also shown on the 'Followers' tab.
        setCurrentUser((prevUser) => ({
            ...prevUser,
            following: (prevUser?.following || []).filter(id => id !== userIdToUnfollow)
        }));
        // --- End Optimistic Update ---

        // API Call
        const promise = axios.post(`${process.env.REACT_APP_API_URL}/api/users/${userIdToUnfollow}/unfollow`, {}, { withCredentials: true });

        toast.promise(promise, {
            loading: t('followers.unfollowing'),
            success: (res) => {
                // Success! The optimistic update was correct.
                // We might still refetch *silently* in the background
                // to ensure counts or other data are perfectly synced,
                // but the UI already looks right.
                // fetchFollowData(); // Optional background refresh
                return t('followers.unfollowSuccess');
            },
            error: (err) => {
                // API call failed. Revert the optimistic UI updates.
                setUserData(originalUserData);
                setCurrentUser(originalCurrentUser);
                return t('followers.unfollowError');
            }
        });
    };

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
    const handleConfirmCancel = () => {
        if (!userToUnsubscribe) return;

        const promise = axios.post(
            `${process.env.REACT_APP_API_URL}/api/users/${userToUnsubscribe._id}/cancel-golden`,
            {},
            { withCredentials: true }
        );

        toast.promise(promise, {
            loading: t('followers_canceling_subscription', 'Canceling...'), // You may need to add this key to your translation file
            success: () => {
                setIsModalOpen(false);
                fetchFollowData(); // Refreshes the list of subscriptions
                return t('followers_subscription_canceled', { username: userToUnsubscribe.username });
            },
            error: t('followers_failed_to_cancel')
        });
    };

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
            <RecommendationWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
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
                            // No changes to subscription/date logic
                            isSubscription={activeTab === 'Subscriptions'}
                            showDate={activeTab === 'Subscriptions' || activeTab === 'Subscribers'}
                            onCancel={handleCancelClick}

                            // --- NEW CONDITIONAL BUTTON LOGIC ---

                            // Pass onFollow only if it's the Followers tab AND the user is NOT already being followed
                            onFollow={activeTab === 'Followers' && !currentUser?.following?.includes(item._id) ? handleFollow : null}

                            // Pass onUnfollow only if it's the Following tab
                            onUnfollow={activeTab === 'Following' ? handleUnfollow : null}

                            // isFollowing is only relevant for the Followers tab (to decide if the follow button should show)
                            isFollowing={currentUser?.following?.includes(item._id)}

                            currentUserId={currentUser?._id}
                        />
                    )) : <p className="col-span-full text-gray-500 text-center py-8">{t("followers_no_users")}</p>}
                </div>
                {activeTab === 'Subscriptions' && (
                    <FindMemberWizardTrigger onClick={() => setIsWizardOpen(true)} />
                )}
            </div>
        </>
    );
};

export default FollowersPage;