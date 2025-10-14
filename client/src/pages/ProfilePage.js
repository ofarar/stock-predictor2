// src/pages/ProfilePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

// New Component Imports
import ProfileHeader from '../components/ProfileHeader';
import ProfileStats from '../components/ProfileStats';
import PredictionList from '../components/PredictionList';
import AggressivenessInfoModal from '../components/AggressivenessInfoModal';

// Other required component imports
import GoldenFeed from '../components/GoldenFeed';
import WatchlistShowcase from '../components/WatchlistShowcase';
import BadgeShowcase from '../components/BadgeShowcase';
import PerformanceTabs from '../components/PerformanceTabs';
import PerformanceChart from '../components/PerformanceChart';
import GoldenPostForm from '../components/GoldenPostForm';

// Modal Imports
import EditPredictionModal from '../components/EditPredictionModal';
import GoldenMemberModal from '../components/GoldenMemberModal';
import JoinGoldenModal from '../components/JoinGoldenModal';
import BadgeDetailModal from '../components/BadgeDetailModal';
import BadgeInfoModal from '../components/BadgeInfoModal';
import VerificationModal from '../components/VerificationModal';
import VerifiedStatusModal from '../components/VerifiedStatusModal';
import ConfirmationModal from '../components/ConfirmationModal';

const ProfilePage = ({ settings }) => {
    const { t } = useTranslation();
    const { userId } = useParams();
    const [profileData, setProfileData] = useState(null);
    const [activePredictionQuotes, setActivePredictionQuotes] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('Profile');
    const [searchParams] = useSearchParams();

    // All state for modals remains in the parent component
    const [isGoldenModalOpen, setIsGoldenModalOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [selectedBadge, setSelectedBadge] = useState(null);
    const [isBadgeInfoOpen, setIsBadgeInfoOpen] = useState(false);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [predictionToEdit, setPredictionToEdit] = useState(null);
    const [isAggressivenessInfoOpen, setIsAggressivenessInfoOpen] = useState(false);

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
                axios.get(`${process.env.REACT_APP_API_URL}/api/profile/${userId}`, { withCredentials: true }),
                axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true })
            ]);
            const profile = profileRes.data;
            setProfileData(profile);
            setCurrentUser(currentUserRes.data);
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
    
    const handleEditClick = (prediction) => {
        setPredictionToEdit(prediction);
        setIsEditModalOpen(true);
    };

    const handleGetVerified = () => {
        const promise = axios.post(`${process.env.REACT_APP_API_URL}/api/profile/verify`, {}, { withCredentials: true })
            .then(() => fetchData());
        toast.promise(promise, {
            loading: t('processing_verification_msg'),
            success: t('verification_success_msg'),
            error: t('verification_failed_msg'),
        });
        setIsVerificationModalOpen(false);
    };

    const confirmCancelVerification = () => {
        const promise = axios.post(`${process.env.REACT_APP_API_URL}/api/profile/cancel-verification`, {}, { withCredentials: true })
            .then(() => fetchData());
        toast.promise(promise, {
            loading: t('processing_verification_msg'),
            success: t('verification_success_msg'),
            error: t('verification_failed_msg'),
        });
        setIsCancelConfirmOpen(false);
    };

    if (loading) return <div className="text-center text-white mt-10">{t('profile.loading')}</div>;
    if (!profileData) return <div className="text-center text-white mt-10">{t('profile.userNotFound')}</div>;

    const { user, predictions, performance, watchlistQuotes } = profileData;
    const isOwnProfile = currentUser?._id === user._id;
    const isFollowing = currentUser?.following?.includes(user._id);
    const isSubscribed = currentUser?.goldenSubscriptions?.some(sub => sub.user === user._id);
    const activePredictions = predictions.filter(p => p.status === 'Active');
    const assessedPredictions = predictions.filter(p => p.status === 'Assessed');

    return (
        <>
            {/* All modals are rendered here */}
            <VerifiedStatusModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} onCancel={() => { setIsStatusModalOpen(false); setIsCancelConfirmOpen(true); }} />
            <ConfirmationModal isOpen={isCancelConfirmOpen} onClose={() => setIsCancelConfirmOpen(false)} onConfirm={confirmCancelVerification} title={t('cancel_verification_title')} message={t('cancel_verification_msg')} />
            <VerificationModal isOpen={isVerificationModalOpen} onClose={() => setIsVerificationModalOpen(false)} onConfirm={handleGetVerified} price={settings?.verificationPrice.toFixed(2) || '4.99'} />
            <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
            <BadgeInfoModal isOpen={isBadgeInfoOpen} onClose={() => setIsBadgeInfoOpen(false)} />
            <GoldenMemberModal isOpen={isGoldenModalOpen} onClose={() => setIsGoldenModalOpen(false)} user={user} onUpdate={fetchData} />
            <JoinGoldenModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} goldenMember={user} onUpdate={fetchData} />
            <GoldenPostForm isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} onPostCreated={fetchData} />
            <EditPredictionModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} prediction={predictionToEdit} onUpdate={fetchData} />
            <AggressivenessInfoModal isOpen={isAggressivenessInfoOpen} onClose={() => setIsAggressivenessInfoOpen(false)} />

            <div className="animate-fade-in max-w-6xl mx-auto">
                <ProfileHeader
                    profileData={profileData}
                    currentUser={currentUser}
                    isOwnProfile={isOwnProfile}
                    isFollowing={isFollowing}
                    isSubscribed={isSubscribed}
                    handleFollow={handleFollow}
                    handleUnfollow={handleUnfollow}
                    setIsJoinModalOpen={setIsJoinModalOpen}
                    setIsGoldenModalOpen={setIsGoldenModalOpen}
                    setIsVerificationModalOpen={setIsVerificationModalOpen}
                    setIsStatusModalOpen={setIsStatusModalOpen}
                    settings={settings}
                />
                
                <ProfileStats
                    user={user}
                    performance={performance}
                    predictionCount={predictions.length}
                    onInfoClick={() => setIsAggressivenessInfoOpen(true)}
                />

                <div className="flex border-b border-gray-700 mb-8">
                    <button onClick={() => setActiveTab('Profile')} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'Profile' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>{t('profile_tab_label')}</button>
                    {user.isGoldenMember && (<button onClick={() => setActiveTab('GoldenFeed')} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'GoldenFeed' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-yellow-600 hover:text-yellow-400'}`}>{t('golden_feed_tab_label')}</button>)}
                </div>

                {activeTab === 'Profile' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <WatchlistShowcase stocks={watchlistQuotes} />
                            <BadgeShowcase badges={user.badges} onBadgeClick={setSelectedBadge} onInfoClick={() => setIsBadgeInfoOpen(true)} />
                            <PerformanceTabs performance={performance} />
                            <PerformanceChart chartData={profileData.chartData} />
                        </div>
                        <div className="lg:col-span-1 space-y-8 self-start">
                            <PredictionList
                                titleKey="active_predictions_title"
                                predictions={activePredictions}
                                quotes={activePredictionQuotes}
                                isOwnProfile={isOwnProfile}
                                onEditClick={handleEditClick}
                                emptyTextKey="no_active_predictions_label"
                            />
                            <PredictionList
                                titleKey="prediction_history_title"
                                predictions={assessedPredictions}
                                isOwnProfile={isOwnProfile}
                                onEditClick={handleEditClick}
                                emptyTextKey="no_prediction_history_label"
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'GoldenFeed' && (
                    <div>
                        {isOwnProfile && (
                            <div className="flex justify-end mb-4">
                                <button onClick={() => setIsPostModalOpen(true)} className="bg-yellow-500 text-black font-bold py-2 px-4 rounded-md hover:bg-yellow-400">{t('create_golden_post_btn')}</button>
                            </div>
                        )}
                        <GoldenFeed profileUser={user} onJoinClick={() => setIsJoinModalOpen(true)} />
                    </div>
                )}
            </div>
        </>
    );
};

export default ProfilePage;