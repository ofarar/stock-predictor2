import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import VerifiedTick from './VerifiedTick';
import { formatNumericDate } from '../utils/formatters';

const UserCard = ({ user, onCancel, onJoin, isSubscription, showDate, settings, onFollow, onUnfollow, isFollowing, currentUserId }) => {
    const { t } = useTranslation();

    if (!user) return null;

    const isCurrentUserCard = currentUserId === user._id;

    return (
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center text-center transition-all duration-300 hover:shadow-lg hover:bg-gray-700 gap-1">
            <Link to={`/profile/${user._id}`} className="w-full">
                <img src={user.avatar} alt={user.username} className={`w-20 h-20 rounded-full mx-auto mb-2 border-2 ${user.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`} />
                <div className="font-bold text-white flex items-center justify-center">
                    <span className="truncate">{user.username}</span>
                    {settings?.isVerificationEnabled && user.isVerified && (
                        <span className="ms-1 flex-shrink-0"><VerifiedTick /></span>
                    )}
                </div>
            </Link>

            {/* Show Date Logic */}
            {showDate && (user.subscribedAt || user.createdAt) && (
                <p className="text-xs text-gray-500 mt-1">
                    {(isSubscription || user.subscribedAt) // Check if it's a sub tab or has the date
                        ? t('followers_subscribed_on', { date: formatNumericDate(user.subscribedAt || user.createdAt) })
                        : t('member_since_label', { date: formatNumericDate(user.createdAt) })
                    }
                </p>
            )}

            {/* Container for action buttons */}
            <div className="w-full mt-auto pt-2 flex flex-col gap-2">
                {/* Subscription Cancel Button */}
                {isSubscription && onCancel && (
                    <button
                        onClick={() => onCancel(user)}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded w-full"
                    >
                        {t('followers_cancel_subscription')}
                    </button>
                )}

                {/* Join Button (for Recommendation Wizard) */}
                {onJoin && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onJoin(user); }}
                        disabled={user.isSubscribed}
                        className={`text-xs font-bold py-1 px-3 rounded w-full transition-colors ${user.isSubscribed ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 text-gray-900'}`}
                    >
                        {user.isSubscribed ? t('profile_subscribed_badge') : t('profile_join_button', { price: user.goldenMemberPrice || 5 })}
                    </button>
                )}

                {/* Follow/Unfollow Buttons - Corrected Logic */}
                {!isCurrentUserCard && (
                    <>
                        {/* Show Follow button ONLY if onFollow is provided AND user is not already followed */}
                        {onFollow && !isFollowing && (
                            <button
                                onClick={() => onFollow(user._id)}
                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded w-full"
                            >
                                {t('profile_follow_button')}
                            </button>
                        )}
                        {/* Show Unfollow button ONLY if onUnfollow is provided AND user is currently followed */}
                        {onUnfollow && isFollowing && (
                            <button
                                onClick={() => onUnfollow(user._id)}
                                // Change background to red and hover to a darker red
                                className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded w-full"
                            >
                                {t('profile_unfollow_button')}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default UserCard;