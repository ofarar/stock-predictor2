// src/components/AdminUserList.js
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import VerifiedTick from './VerifiedTick';
import LoadMoreButton from './LoadMoreButton';
import { formatDateTimeShort } from '../utils/formatters'; // Import the formatter
import { useTranslation } from 'react-i18next'; // Import useTranslation

// --- UserCard Sub-component ---
// Kept within AdminUserList.js for simplicity, but could be a separate file
const UserCard = ({ user, settings }) => {
    const { i18n } = useTranslation(); // Get i18n instance for date formatting

    return (
        <Link
            to={`/profile/${user._id}`}
            // Use flex-col on small screens, flex-row on larger screens
            className="bg-gray-700 p-4 rounded-lg flex flex-col sm:flex-row items-center gap-4 transition-colors hover:bg-gray-600"
        >
            {/* Left side: avatar + name + verified date */}
            <div className="flex flex-col items-center w-20 sm:w-24 md:w-28 flex-shrink-0">
                <img
                    src={user.avatar}
                    alt="avatar"
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-4 ${user.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`}
                />
                {/* Container for username and tick */}
                <div className="flex items-center mt-2 max-w-full">
                    <p className="font-bold text-white text-center break-words line-clamp-2">
                        {user.username}
                    </p>
                    {/* Conditionally render VerifiedTick based on BOTH settings and user status */}
                    {settings?.isVerificationEnabled && user.isVerified && (
                         <span className="ml-1 inline-block align-middle flex-shrink-0">
                             <VerifiedTick />
                         </span>
                    )}
                </div>
                 {/* --- Display VERIFIED DATE --- */}
                 {settings?.isVerificationEnabled && user.isVerified && user.verifiedAt && (
                    <p className="text-xs text-green-400 mt-1 whitespace-nowrap">
                        Ver. {formatDateTimeShort(user.verifiedAt, i18n.language)}
                    </p>
                )}
                 {/* --------------------------- */}
            </div>

            {/* Right side: stats */}
            <div className="flex-grow grid grid-cols-2 sm:grid-cols-4 gap-4 items-center w-full">
                 <div className="text-center">
                    <p className="text-xs text-gray-400">Followers</p>
                    <p className="font-bold text-white">{user.followersCount}</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-400">Predictions</p>
                    <p className="font-bold text-white">{user.predictionCount}</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-400">Avg Rating</p>
                    <p className="font-bold text-green-400">{user.avgRating}</p>
                </div>
                {user.isGoldenMember && (
                    <div className="text-center">
                        <p className="text-xs text-yellow-400">Subscribers</p>
                        <p className="font-bold text-white">{user.goldenSubscribersCount}</p>
                    </div>
                )}
            </div>
        </Link>
    );
};
// --- End UserCard Sub-component ---


// --- Main AdminUserList Component ---
const AdminUserList = ({ settings }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'golden', 'verified'
    const [sort, setSort] = useState('username-asc'); // e.g., 'followersCount-desc'
    const [visibleCount, setVisibleCount] = useState(10); // Load More state

    // Fetch users when filter or sort changes
    useEffect(() => {
        setLoading(true);
        setVisibleCount(10); // Reset visible count on filter/sort change
        const [sortBy, order] = sort.split('-');

        const params = {
            sortBy,
            order,
            // Only include filter params if they are active
            ...(filter === 'golden' && { isGoldenMember: 'true' }),
            ...(filter === 'verified' && { isVerified: 'true' }),
        };

        axios.get(`${process.env.REACT_APP_API_URL}/api/admin/all-users`, { params, withCredentials: true })
            .then(res => {
                setUsers(res.data); // Replace users with new filtered/sorted list
            })
            .catch(() => toast.error("Could not fetch user list."))
            .finally(() => setLoading(false));
    }, [filter, sort]); // Re-fetch only when filter or sort changes

    // Memoize the list to display based on visibleCount
    const usersToDisplay = useMemo(() => users.slice(0, visibleCount), [users, visibleCount]);

    return (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
            {/* Header and Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">User Management</h2>
                    <span className="text-gray-400 font-semibold">Total: {users.length}</span>
                </div>

                {/* Filter & Sort Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                    {/* Filter Buttons */}
                    <div className="flex gap-2 bg-gray-900 p-1 rounded-md justify-center">
                        <button onClick={() => setFilter('all')} className={`px-4 py-1 text-sm font-bold rounded w-full ${filter === 'all' ? 'bg-green-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>All Users</button>
                        <button onClick={() => setFilter('golden')} className={`px-4 py-1 text-sm font-bold rounded w-full ${filter === 'golden' ? 'bg-yellow-500 text-black' : 'text-gray-300 hover:bg-gray-700'}`}>Golden</button>
                        {/* Only show Verified filter if the feature is enabled */}
                        {settings?.isVerificationEnabled && (
                            <button onClick={() => setFilter('verified')} className={`px-3 py-1 text-sm font-bold rounded ${filter === 'verified' ? 'bg-green-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Verified</button>
                        )}
                    </div>
                    {/* Sort Dropdown */}
                    <div>
                        <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full bg-gray-900 text-white p-2 rounded-md h-full focus:outline-none focus:ring-2 focus:ring-green-500">
                            <option value="username-asc">Sort by Username (A-Z)</option>
                            <option value="predictionCount-desc">Sort by Predictions</option>
                            <option value="avgRating-desc">Sort by Avg Rating</option>
                            <option value="followersCount-desc">Sort by Followers</option>
                            <option value="goldenSubscribersCount-desc">Sort by Subscribers</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* User List or Loading/Empty State */}
            {loading ? (
                <div className="text-center text-gray-400 py-8">Loading users...</div>
            ) : (
                <>
                    <div className="space-y-4">
                        {usersToDisplay.length > 0 ? (
                            usersToDisplay.map(user => (
                                // Pass settings down to UserCard
                                <UserCard key={user._id} user={user} settings={settings} />
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-8">No users found matching filters.</p>
                        )}
                    </div>

                    {/* Load More Button */}
                    {visibleCount < users.length && (
                        <LoadMoreButton
                            onClick={() => setVisibleCount(prev => prev + 10)}
                            hasMore={visibleCount < users.length}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default AdminUserList;