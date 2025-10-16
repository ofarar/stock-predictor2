import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import VerifiedTick from './VerifiedTick';
import { formatNumericDate } from '../utils/formatters';

const UserCard = ({ user, onCancel, isSubscription, showDate, settings }) => {
    const { t } = useTranslation();

    if (!user) return null;

    const hasGoldenAccess = settings?.goldenSubscribedTo?.includes(user._id) || settings?.user?.isAdmin;

    return (
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center text-center transition-all duration-300 hover:shadow-lg hover:bg-gray-700">
            <Link to={`/profile/${user._id}`} className="w-full">
                <img src={user.avatar} alt={user.username} className="w-20 h-20 rounded-full mx-auto mb-2 border-2 border-gray-600" />
                <div className="font-bold text-white flex items-center justify-center">
                    <span className="truncate">{user.username}</span>
                    {user.isVerified && <VerifiedTick />}
                </div>
            </Link>
            <p className="text-sm text-yellow-400 mb-2">
                {t('followers_avg_score')}: <span className="font-semibold">{user.score?.toFixed(2) || 'N/A'}</span>
            </p>

            {showDate && (
                <p className="text-xs text-gray-500 mb-2">
                    {t('followers_subscribed_on', { date: formatNumericDate(user.subscriptionDate) })}
                </p>
            )}

            {isSubscription && onCancel && (
                <button
                    onClick={() => onCancel(user)}
                    className="mt-auto text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded w-full"
                >
                    {t('followers_cancel_subscription')}
                </button>
            )}
            {hasGoldenAccess && user.isGoldenMember && (
                 <Link to={`/profile/${user._id}?view=golden_feed`} className="mt-2 text-xs text-yellow-400">View Golden Feed</Link>
            )}
        </div>
    );
};

export default UserCard;