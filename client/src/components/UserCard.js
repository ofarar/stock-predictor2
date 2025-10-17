import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import VerifiedTick from './VerifiedTick';
import { formatNumericDate } from '../utils/formatters';

const UserCard = ({ user, onCancel, onJoin, isSubscription, showDate, settings }) => { // Add onJoin prop
    const { t } = useTranslation();

    if (!user) return null;

    const hasGoldenAccess = settings?.goldenSubscribedTo?.includes(user._id) || settings?.user?.isAdmin;

    return (
        // MODIFIED: Added gap-1 to create space between flex items
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center text-center transition-all duration-300 hover:shadow-lg hover:bg-gray-700 gap-1">
            <Link to={`/profile/${user._id}`} className="w-full">
                <img src={user.avatar} alt={user.username} className={`w-20 h-20 rounded-full mx-auto mb-2 border-2 ${user.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`} />
                <div className="font-bold text-white flex items-center justify-center">
                    <span className="truncate">{user.username}</span>
                    {settings?.isVerificationEnabled && user.isVerified && (
                        <span className="ml-1 flex-shrink-0"><VerifiedTick /></span>
                    )}
                </div>
            </Link>
            {/* REMOVED: The confusing score display is now gone */}
            {showDate && (user.subscribedAt || user.createdAt) && (
                <p className="text-xs text-gray-500 mt-1">
                    {user.subscribedAt
                        ? t('followers_subscribed_on', { date: formatNumericDate(user.subscribedAt) })
                        : t('member_since_label', { date: formatNumericDate(user.createdAt) })
                    }
                </p>
            )}

            <div className="w-full mt-auto pt-2">
                {isSubscription && onCancel && (
                    <button
                        onClick={() => onCancel(user)}
                        className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded w-full"
                    >
                        {t('followers_cancel_subscription')}
                    </button>
                )}
                {onJoin && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // <-- This line is essential
                            onJoin(user);
                        }}
                        disabled={user.isSubscribed}
                        className={`text-xs font-bold py-1 px-3 rounded w-full transition-colors ${user.isSubscribed
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-yellow-500 hover:bg-yellow-600 text-gray-900'
                            }`}
                    >
                        {user.isSubscribed
                            ? t('profile_subscribed_badge')
                            : t('profile_join_button', { price: user.goldenMemberPrice || 5 })
                        }
                    </button>
                )}
            </div>
            {hasGoldenAccess && user.isGoldenMember && (
                <Link to={`/profile/${user._id}?view=golden_feed`} className="mt-2 text-xs text-yellow-400">View Golden Feed</Link>
            )}
        </div>
    );
};

export default UserCard;