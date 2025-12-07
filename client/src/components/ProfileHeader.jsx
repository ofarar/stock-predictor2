// src/components/ProfileHeader.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import VerifiedTick from './VerifiedTick';

const ProfileHeader = React.forwardRef(({ profileData, currentUser, isOwnProfile, isFollowing, isSubscribed, handleFollow, handleUnfollow, setIsJoinModalOpen, setIsGoldenModalOpen, setIsVerificationModalOpen, setIsStatusModalOpen, onOpenSummary, settings, isAnimating, requestLogin }, ref) => {
    const { t, i18n } = useTranslation();
    const { user, followersCount, followingCount, goldenSubscribersCount, goldenSubscriptionsCount } = profileData;
    const avatarBorder = user.isGoldenMember ? 'border-yellow-400' : 'border-green-500';

    // --- Start: Logic to split username ---
    const usernameParts = user.username.split(' ');
    const lastWord = usernameParts.pop() || ''; // Get last word, handle empty strings
    const usernameWithoutLastWord = usernameParts.join(' '); // Get the rest
    // --- End: Logic to split username ---
    const hasRestrictions = user.stripeConnectRestrictions || false;

    return (
        <div className="relative flex flex-col md:flex-row items-center gap-6 bg-gray-800 p-6 rounded-lg mb-8">
            {/* NEW WARNING BANNER: Show only if it's the owner AND they have restrictions */}
            {isOwnProfile && hasRestrictions && (
                <div className="absolute top-0 start-0 end-0 bg-red-600 p-2 text-center text-white text-sm font-bold rounded-t-lg">
                    {t('profile.stripeActionRequired')}
                </div>
            )}
            {/* Settings Icon (Top Right) - Only for own profile */}
            {isOwnProfile && (
                <Link to="/settings/notifications" className="absolute top-4 end-4 sm:top-6 sm:end-6 text-gray-400 hover:text-white" title={t('header_settings')}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                </Link>
            )}

            {/* Avatar Section */}
            <div className="relative mt-8 md:mt-0 flex-shrink-0">
                <img src={user?.avatar || `https://avatar.iran.liara.run/public/boy?username=${user?._id}`} alt="avatar" className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 ${avatarBorder} transition-colors object-cover`} />
                {isOwnProfile && (
                    <Link to="/profile/edit" className="absolute -bottom-1 -end-1 bg-gray-700 p-2 rounded-full text-white hover:bg-gray-600" title={t('edit_profile_label')}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536l10.732-10.732z"></path></svg>
                    </Link>
                )}
            </div>

            {/* User Info Section */}
            <div className="flex-grow text-center md:text-start flex flex-col gap-2 w-full">
                {/* Username & Badges */}
                <div className="flex flex-col md:flex-row items-center md:items-baseline gap-2 justify-center md:justify-start">
                    <h1 className="text-3xl md:text-4xl font-bold text-white break-all">
                        {usernameWithoutLastWord && <span>{usernameWithoutLastWord} </span>}
                        <span className="inline-block whitespace-nowrap">
                            <span>{lastWord}</span>
                            <span
                                ref={ref}
                                className={`ms-1 inline-flex items-center ${isAnimating ? 'animate-blink-success' : ''}`}
                            >
                                {settings?.isVerificationEnabled && user.isVerified && (
                                    <span className="inline-block translate-y-[1px]">
                                        {isOwnProfile ? (
                                            <VerifiedTick size={1.5} onClick={() => setIsStatusModalOpen(true)} />
                                        ) : (
                                            <VerifiedTick size={1.5} />
                                        )}
                                    </span>
                                )}
                            </span>
                        </span>
                    </h1>
                    {user.isBot && (
                        <span className="mt-1 md:mt-0 md:ms-2 text-xs bg-gray-900 text-yellow-500 border border-yellow-500/50 px-3 py-1 rounded-full font-mono font-bold shadow-lg tracking-widest uppercase flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                            QUANT SYSTEM v2.0
                        </span>
                    )}
                </div>

                {/* AI Metrics (Train Accuracy & Spec) */}
                {user.isBot && user.aiMetrics && (
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        <span className="text-xs font-mono text-green-400 bg-green-900/40 px-2 py-1 rounded border border-green-500/30">
                            TRN ACC: {user.aiMetrics.trainingAccuracy}%
                        </span>
                        <span className="text-xs font-mono text-blue-400 bg-blue-900/40 px-2 py-1 rounded border border-blue-500/30">
                            SPEC: {user.aiMetrics.specialization}
                        </span>
                    </div>
                )}

                {/* Meta Info (Member since, Views) */}
                <div className="flex items-center justify-center md:justify-start gap-4 text-gray-500 text-sm">
                    <span>{t('member_since_label', { date: new Date(user.createdAt).toLocaleDateString(i18n.language) })}</span>
                    <div className="flex items-center gap-1 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>{(user.profileViews || 0).toLocaleString()}</span>
                    </div>
                </div>

                {/* Bio & Socials */}
                <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-4 mt-1">
                    <p className="text-gray-400 text-sm max-w-lg">{user.about || t('no_bio_label')}</p>
                    <div className="flex gap-2">
                        {user.xLink && (<a href={user.xLink} target="_blank" rel="noopener noreferrer nofollow" className="text-gray-400 hover:text-white"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg></a>)}
                        {user.youtubeLink && (<a href={user.youtubeLink} target="_blank" rel="noopener noreferrer nofollow" className="text-gray-400 hover:text-white"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993z" /></svg></a>)}
                        {user.telegramLink && (
                            <a href={user.telegramLink} target="_blank" rel="noopener noreferrer nofollow" className="text-gray-400 hover:text-white" title="Telegram">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z" /></svg>
                            </a>
                        )}
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="mt-4 grid grid-cols-2 lg:flex lg:flex-wrap justify-center md:justify-start gap-x-6 gap-y-2">
                    <Link to={`/profile/${user._id}/followers`} className="text-sm text-gray-400 hover:underline">
                        <span className="font-bold text-white">{followersCount}</span> {t('followers_label')}
                    </Link>
                    <Link to={`/profile/${user._id}/followers`} state={{ activeTab: 'Following' }} className="text-sm text-gray-400 hover:underline">
                        <span className="font-bold text-white">{followingCount}</span> {t('following_label')}
                    </Link>
                    {isOwnProfile && user.isGoldenMember && (
                        <Link to={`/profile/${user._id}/followers`} state={{ activeTab: 'Subscribers' }} className="text-sm text-yellow-400 hover:underline">
                            <span className="font-bold text-white">{goldenSubscribersCount}</span> {t('subscribers_label')}
                        </Link>
                    )}
                    {isOwnProfile && (
                        <Link to={`/profile/${user._id}/followers`} state={{ activeTab: 'Subscriptions' }} className="text-sm text-yellow-400 hover:underline">
                            <span className="font-bold text-white">{goldenSubscriptionsCount}</span> {t('subscriptions_label')}
                        </Link>
                    )}
                </div>
            </div>

            {/* Actions Section */}
            <div className="w-full md:w-auto flex flex-wrap items-center justify-center md:justify-end gap-3 mt-4 md:mt-0 flex-shrink-0">
                {!isOwnProfile && (
                    <>
                        {isSubscribed ? (
                            <div className="font-bold py-2 px-5 rounded-md bg-gray-700 text-yellow-400 border border-yellow-500 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                {t('subscribed_label')}
                            </div>
                        ) : user.isGoldenMember ? (
                            user.acceptingNewSubscribers ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!currentUser) requestLogin();
                                        else setIsJoinModalOpen(true);
                                    }}
                                    className="font-bold py-2 px-5 rounded-md bg-yellow-500 text-black hover:bg-yellow-400"
                                >
                                    {t('join_label', { price: user.goldenMemberPrice })}
                                </button>
                            ) : (
                                <button disabled className="font-bold py-2 px-5 rounded-md bg-gray-700 text-gray-400 cursor-not-allowed">
                                    {t('subscriptions_paused_label')}
                                </button>
                            )
                        ) : null}

                        {isFollowing ? (
                            <button
                                onClick={() => {
                                    if (!currentUser) requestLogin();
                                    else handleUnfollow();
                                }}
                                className="bg-gray-700 text-white font-bold py-2 px-5 rounded-md hover:bg-red-600"
                            >
                                {t('following_btn')}
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    if (!currentUser) requestLogin();
                                    else handleFollow();
                                }}
                                className="bg-blue-600 text-white font-bold py-2 px-5 rounded-md hover:bg-blue-700"
                            >
                                {t('follow_btn')}
                            </button>
                        )}
                    </>
                )}
                {isOwnProfile && (
                    <>
                        {settings?.isVerificationEnabled && !user.isVerified && (
                            <button onClick={() => setIsVerificationModalOpen(true)} className="font-bold py-2 px-5 rounded-md bg-green-600 text-white hover:bg-green-700">{t('get_verified_label')}</button>
                        )}
                        <button onClick={() => setIsGoldenModalOpen(true)} className="font-bold py-2 px-5 rounded-md bg-yellow-500 text-black hover:bg-yellow-400">{user.isGoldenMember ? t('manage_gold_label') : t('become_golden_label')}</button>
                    </>
                )}
                {/* Always show Smart Summary button */}
                <button
                    onClick={onOpenSummary}
                    data-testid="smart-summary-btn"
                    className="flex items-center gap-2 text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 hover:from-blue-300 hover:to-purple-300 transition-colors border border-purple-500/30 rounded-full px-4 py-2 hover:bg-purple-500/10"
                >
                    <span>✨</span>
                    {t('smart_summary_btn', 'Smart Summary')}
                </button>
            </div>
        </div>
    );
});

ProfileHeader.displayName = 'ProfileHeader';
export default ProfileHeader;