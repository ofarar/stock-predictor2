import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { API_URL, API_ENDPOINTS, STORAGE_KEYS, URL_PARAMS, PARAM_VALUES, PREDICTION_STATUS, NUMERIC_CONSTANTS, DEFAULT_VALUES } from '../constants';

// New Component Imports
import ProfileHeader from '../components/ProfileHeader';
import ProfileStats from '../components/ProfileStats';
import PredictionList from '../components/PredictionList';
import AggressivenessInfoModal from '../components/AggressivenessInfoModal';
import PromoBanner from '../components/PromoBanner';

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
import CreatorPoolModal from '../components/CreatorPoolModal';
import AnalystRatingInfoModal from '../components/AnalystRatingInfoModal';

const ProfilePage = ({ settings, requestLogin }) => {
    const { t } = useTranslation();
    const { userId } = useParams();
    const location = useLocation();
    const [profileData, setProfileData] = useState(null);
    const [activePredictionQuotes, setActivePredictionQuotes] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState(PARAM_VALUES.PROFILE);
    const [searchParams, setSearchParams] = useSearchParams();

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
    const [filteredPerformance, setFilteredPerformance] = useState(null);
    const [isVerifiedJustNow, setIsVerifiedJustNow] = useState(false);
    const [isCreatorPoolModalOpen, setIsCreatorPoolModalOpen] = useState(false);
    const [isRatingInfoModalOpen, setIsRatingInfoModalOpen] = useState(false);
    const [isCreatorPoolAnimated, setIsCreatorPoolAnimated] = useState(false);

    // --- NEW: Handle Profile View Counting ---
    useEffect(() => {
        if (!userId) return;

        const logView = () => {
            try {
                // Use localStorage to debounce views (1 view per hour per profile)
                const viewedProfiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.VIEWED_PROFILES) || '{}');
                const now = Date.now();

                // If never viewed OR viewed more than 1 hour ago
                if (!viewedProfiles[userId] || (now - viewedProfiles[userId] > NUMERIC_CONSTANTS.ONE_HOUR_MS)) {
                    // Fire and forget
                    axios.post(`${API_URL}${API_ENDPOINTS.USER_VIEW(userId)}`);

                    // Update local storage
                    viewedProfiles[userId] = now;
                    localStorage.setItem(STORAGE_KEYS.VIEWED_PROFILES, JSON.stringify(viewedProfiles));
                }
            } catch (error) {
                console.error("Failed to log profile view", error);
            }
        };

        logView();
    }, [userId]);

    useEffect(() => {
        // Check if the success parameter exists
        if (searchParams.get(URL_PARAMS.SUBSCRIBE) === PARAM_VALUES.SUCCESS) {
        }
    }, [searchParams, setSearchParams, t, profileData?.user?.username]);

    useEffect(() => {
        if (isVerifiedJustNow) {
            const timer = setTimeout(() => {
                setIsVerifiedJustNow(false); // Reset the animation state
            }, NUMERIC_CONSTANTS.VERIFICATION_ANIMATION_DURATION_MS);
            return () => clearTimeout(timer);
        }
    }, [isVerifiedJustNow]);

    // --- NEW: Handle Creator Pool Animation ---
    useEffect(() => {
        // Only run for own profile and if we have a current user loaded
        if (currentUser?._id === userId) {
            // Check if the user has ALREADY seen it (from DB)
            if (!currentUser.hasSeenCreatorPoolAnimation) {
                // If NOT seen, trigger animation
                setIsCreatorPoolAnimated(true);

                // And immediately mark as seen in DB (fire and forget)
                axios.post(`${API_URL}${API_ENDPOINTS.MARK_CREATOR_POOL_SEEN}`, {}, { withCredentials: true })
                    .catch(err => console.error("Failed to mark creator pool as seen", err));
            }
        }
    }, [currentUser, userId]);

    useEffect(() => {
        const tab = searchParams.get(URL_PARAMS.TAB);
        if (tab === PARAM_VALUES.GOLDEN_FEED) {
            setActiveTab(PARAM_VALUES.GOLDEN_FEED);
        }
    }, [searchParams]);

    useEffect(() => {
        // FIX: Check for profileData to ensure the data fetch has completed
        // and the core profile owner's data is available.
        if (profileData && location.hash === "#active") {
            console.log("Autoscroll: Triggered for #active");

            const ATTEMPT_INTERVAL_MS = 100;
            const MAX_ATTEMPTS = 20; // 2 seconds total
            let attempts = 0;

            const scrollInterval = setInterval(() => {
                attempts++;
                const element = document.getElementById("active");
                console.log(`Autoscroll: Attempt ${attempts}, Element found?`, !!element);

                if (element) {
                    console.log("Autoscroll: Element found! Scrolling...");
                    // Use scrollIntoView which respects scroll-margin-top (added in PredictionList)
                    element.scrollIntoView({ behavior: "smooth", block: "start" });

                    // Clear the hash after scrolling
                    window.history.replaceState(null, null, window.location.pathname + window.location.search);

                    clearInterval(scrollInterval);
                } else if (attempts >= MAX_ATTEMPTS) {
                    console.warn("Autoscroll: Element with id 'active' not found after max attempts.");
                    clearInterval(scrollInterval);
                }
            }, ATTEMPT_INTERVAL_MS);

            // Cleanup interval on unmount or dependency change
            return () => clearInterval(scrollInterval);
        }
        // FIX: Depend on profileData change (signaling data fetch success) and hash change
    }, [profileData, location.hash]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [profileRes, currentUserRes] = await Promise.all([
                axios.get(`${API_URL}${API_ENDPOINTS.PROFILE(userId)}`, { withCredentials: true }),
                axios.get(`${API_URL}${API_ENDPOINTS.CURRENT_USER}`, { withCredentials: true })
            ]);
            const profile = profileRes.data;
            console.log("ProfilePage fetched data:", profile.user);
            setProfileData(profile);
            setCurrentUser(currentUserRes.data);
            setFilteredPerformance(profile.performance); // Initialize with overall performance
            const activePredictions = profile.predictions.filter(p => p.status === PREDICTION_STATUS.ACTIVE);
            if (activePredictions.length > 0) {
                try {
                    const tickers = [...new Set(activePredictions.map(p => p.stockTicker))];
                    const quotesRes = await axios.post(`${API_URL}${API_ENDPOINTS.QUOTES}`, { tickers }, { withCredentials: true });

                    // Check if quotesRes.data exists and is an array before reducing
                    if (quotesRes.data && Array.isArray(quotesRes.data)) {
                        const quotesMap = quotesRes.data.reduce((acc, quote) => {
                            if (quote) { // Ensure quote is not null
                                acc[quote.symbol] = quote.regularMarketPrice;
                            }
                            return acc;
                        }, {});
                        setActivePredictionQuotes(quotesMap);
                    }
                } catch (quoteError) {
                    console.warn("Could not fetch live prices for active predictions. Page will still load.", quoteError);
                    // On failure, we simply don't set the active prediction quotes,
                    // and the component will show "..." placeholders.
                }
            }
        } catch (error) {
            toast.error("Could not load profile.");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const handleOpenGoldenModal = useCallback(async () => {
        if (currentUser?.isGoldenMember) {
            try {
                // 1. Synchronize the compliance status (updates the DB fields)
                await axios.post(`${API_URL}/api/stripe/connect/verify-status`, {}, { withCredentials: true });

                // 2. Refetch the whole profile data to get the new restrictions status from DB
                await fetchData();

                // 3. Open the modal (it will read the updated 'user' state from profileData)
                setIsGoldenModalOpen(true);

            } catch (error) {
                toast.error(t('Could not verify Stripe status. Please try again.'));
            }
        } else {
            // For "Become Golden Member" button (non-owner mode)
            setIsGoldenModalOpen(true);
        }
    }, [currentUser, fetchData, t]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePerformanceFilterChange = useCallback((newPerformance) => {
        setFilteredPerformance(newPerformance);
    }, []);

    const handleFollow = () => {
        axios.post(`${API_URL}${API_ENDPOINTS.FOLLOW(userId)}`, {}, { withCredentials: true }).then(() => fetchData());
    };
    const handleUnfollow = () => {
        axios.post(`${API_URL}${API_ENDPOINTS.UNFOLLOW(userId)}`, {}, { withCredentials: true }).then(() => fetchData());
    };

    const handleEditClick = (prediction) => {
        setPredictionToEdit(prediction);
        setIsEditModalOpen(true);
    };

    const confirmCancelVerification = () => {
        const promise = axios.post(`${API_URL}${API_ENDPOINTS.CANCEL_VERIFICATION}`, {}, { withCredentials: true })
            .then(() => fetchData());
        toast.promise(promise, {
            loading: t('processing_verification_msg'),
            success: t('verification_removed_success_msg'),
            error: t('verification_failed_msg'),
        });
        setIsCancelConfirmOpen(false);
    };

    if (loading) return <div className="text-center text-white mt-10">{t('profile.loading')}</div>;
    if (!profileData) return <div className="text-center text-white mt-10">{t('profile.userNotFound')}</div>;

    const { user, predictions, performance } = profileData;
    const isOwnProfile = currentUser?._id === user._id;
    const isFollowing = currentUser?.following?.includes(user._id);
    const isSubscribed = currentUser?.goldenSubscriptions?.some(sub => sub.user === user._id);
    const activePredictions = predictions.filter(p => p.status === PREDICTION_STATUS.ACTIVE);
    const assessedPredictions = predictions.filter(p => p.status === PREDICTION_STATUS.ASSESSED);

    // --- 2. CREATE DYNAMIC SEO CONTENT ---
    const pageTitle = t('seo.profile_page.title', {
        username: user.username
    });
    const pageDescription = t('seo.profile_page.description', {
        username: user.username
    });
    // --- END ---

    return (
        <>
            {/* --- 3. ADD HELMET COMPONENT --- */}
            <Helmet>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
            </Helmet>
            {/* --- END --- */}
            {/* All modals are rendered here */}
            <VerifiedStatusModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} onCancel={() => { setIsStatusModalOpen(false); setIsCancelConfirmOpen(true); }} />
            <ConfirmationModal isOpen={isCancelConfirmOpen} onClose={() => setIsCancelConfirmOpen(false)} onConfirm={confirmCancelVerification} title={t('cancel_verification_title')} message={t('cancel_verification_msg')} />
            <VerificationModal
                isOpen={isVerificationModalOpen}
                onClose={() => setIsVerificationModalOpen(false)}
                // Make the function async to await fetchData
                onUpdate={async () => {
                    try {
                        // 1. Wait for the data to finish loading FIRST
                        await fetchData();
                        // 2. THEN trigger the animation state
                        setIsVerifiedJustNow(true);
                    } catch (error) {
                        // Handle potential errors during fetchData if necessary
                        console.error("Error fetching data after verification:", error);
                    }
                }}
                price={settings?.verificationPrice.toFixed(2) || DEFAULT_VALUES.VERIFICATION_PRICE}
            />
            <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
            <BadgeInfoModal isOpen={isBadgeInfoOpen} onClose={() => setIsBadgeInfoOpen(false)} />
            <GoldenMemberModal isOpen={isGoldenModalOpen} onClose={() => setIsGoldenModalOpen(false)} user={user} onUpdate={fetchData} />
            <JoinGoldenModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} goldenMember={user} onUpdate={fetchData} />
            <GoldenPostForm isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} onPostCreated={fetchData} />
            <EditPredictionModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} prediction={predictionToEdit} onUpdate={fetchData} />
            <AggressivenessInfoModal isOpen={isAggressivenessInfoOpen} onClose={() => setIsAggressivenessInfoOpen(false)} />

            {/* 3. ADD THE NEW MODAL */}
            <CreatorPoolModal
                isOpen={isCreatorPoolModalOpen}
                onClose={() => setIsCreatorPoolModalOpen(false)}
                currentProfileId={user._id}
            />

            {/* 3. ADD THE NEW MODAL */}
            <AnalystRatingInfoModal
                isOpen={isRatingInfoModalOpen}
                onClose={() => setIsRatingInfoModalOpen(false)}
            />

            <div className="animate-fade-in max-w-6xl mx-auto">
                {/* --- NEW: Promo Banner displayed for guests if enabled in settings --- */}
                {!currentUser && settings?.isPromoBannerActive && (
                    <div className="mb-6">
                        <PromoBanner />
                    </div>
                )}

                <ProfileHeader
                    profileData={profileData}
                    currentUser={currentUser}
                    isOwnProfile={isOwnProfile}
                    isFollowing={isFollowing}
                    isSubscribed={isSubscribed}
                    handleFollow={handleFollow}
                    handleUnfollow={handleUnfollow}
                    isAnimating={isVerifiedJustNow}
                    setIsJoinModalOpen={() => {
                        console.log("ProfileHeader button clicked, setting modal to open!");
                        setIsJoinModalOpen(true);
                    }}
                    setIsGoldenModalOpen={handleOpenGoldenModal}
                    setIsVerificationModalOpen={setIsVerificationModalOpen}
                    setIsStatusModalOpen={setIsStatusModalOpen}
                    settings={settings}
                    requestLogin={requestLogin}
                />

                <ProfileStats
                    user={user}
                    performance={filteredPerformance}
                    predictionCount={predictions.length}
                    totalAnalystRating={profileData.totalAnalystRating}
                    onInfoClick={() => setIsAggressivenessInfoOpen(true)}
                    onCreatorPoolClick={() => {
                        setIsCreatorPoolModalOpen(true);
                        setIsCreatorPoolAnimated(false);
                    }}
                    onRatingInfoClick={() => setIsRatingInfoModalOpen(true)}
                    isCreatorPoolAnimated={isCreatorPoolAnimated}
                />

                <div className="flex border-b border-gray-700 mb-8">
                    <button onClick={() => setActiveTab(PARAM_VALUES.PROFILE)} className={`px-4 py-2 font-bold transition-colors ${activeTab === PARAM_VALUES.PROFILE ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>{t('profile_tab_label')}</button>
                    {user.isGoldenMember && (<button onClick={() => setActiveTab(PARAM_VALUES.GOLDEN_FEED)} className={`px-4 py-2 font-bold transition-colors ${activeTab === PARAM_VALUES.GOLDEN_FEED ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-yellow-600 hover:text-yellow-400'}`}>{t('golden_feed_tab_label')}</button>)}
                </div>

                {activeTab === PARAM_VALUES.PROFILE && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <WatchlistShowcase stocks={user.watchlist} />
                            <BadgeShowcase badges={user.badges} onBadgeClick={setSelectedBadge} onInfoClick={() => setIsBadgeInfoOpen(true)} />
                            <PerformanceTabs
                                performance={performance}
                                onFilterChange={handlePerformanceFilterChange}
                            />
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
                                profileUsername={user.username}
                                id="active"
                            />
                            <PredictionList
                                titleKey="prediction_history_title"
                                predictions={assessedPredictions}
                                isOwnProfile={isOwnProfile}
                                onEditClick={handleEditClick}
                                emptyTextKey="no_prediction_history_label"
                                profileUsername={user.username}
                            />
                        </div>
                    </div>
                )}

                {activeTab === PARAM_VALUES.GOLDEN_FEED && (
                    <div>
                        {isOwnProfile && (
                            <div className="flex justify-end mb-4">
                                <button onClick={() => setIsPostModalOpen(true)} className="bg-yellow-500 text-black font-bold py-2 px-4 rounded-md hover:bg-yellow-400">{t('create_golden_post_btn')}</button>
                            </div>
                        )}
                        {/* Pass the ownership flag here: */}
                        <GoldenFeed profileUser={user} onJoinClick={() => setIsJoinModalOpen(true)} isOwnProfile={isOwnProfile} />
                    </div>
                )}
            </div>
        </>
    );
};

export default ProfilePage;