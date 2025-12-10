// src/components/AdminUserList.jsx
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import VerifiedTick from './VerifiedTick';
import LoadMoreButton from './LoadMoreButton';
import LimitEditModal from './LimitEditModal';

import { formatDateTimeShort } from '../utils/formatters';

// --- NEW: Simple Country Flag Helper ---
const getFlagEmoji = (countryCode) => {
    if (!countryCode) return null;
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
};

// --- UserCard Component ---
const UserCard = ({ user, onEditLimit }) => {
    return (
        <div className="bg-gray-700 p-4 rounded-lg flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4 border border-gray-600 shadow-sm hover:bg-gray-650 transition-colors">
            {/* User Info Section */}
            <div className="flex items-center gap-4 w-full sm:w-auto">
                <Link to={`/profile/${user._id}`}>
                    <img
                        src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user._id}`}
                        alt={user.username}
                        className="w-12 h-12 rounded-full border-2 border-gray-500 shadow-sm"
                    />
                </Link>
                <div className="text-left">
                    <div className="flex items-center gap-1">
                        <Link to={`/profile/${user._id}`} className="font-bold text-white text-lg hover:underline">
                            {user.username}
                        </Link>
                        {user.isVerified && <VerifiedTick />}
                        {user.isGoldenMember && <span className="text-yellow-400 text-xs ml-1" title="Golden Member">👑</span>}
                        {/* --- NEW: Country Flag --- */}
                        {user.country && (
                            <span className="text-lg ml-1" title={user.country}>
                                {getFlagEmoji(user.country)}
                            </span>
                        )}
                    </div>
                    {/* User Meta: Joined Date */}
                    {user.createdAt && (
                        <p className="text-xs text-gray-400">
                            Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4 w-full sm:w-auto text-center sm:text-left">
                {/* Predictions */}
                <div className="flex flex-col items-center sm:items-start">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Preds</span>
                    <span className="font-semibold text-white">{user.predictionCount || 0}</span>
                </div>

                {/* Accuracy */}
                <div className="flex flex-col items-center sm:items-start">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Acc</span>
                    <span className={`font-semibold ${(user.avgRating || 0) >= 3 ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                        {user.avgRating ? user.avgRating.toFixed(1) : '-'}
                    </span>
                </div>

                {/* Followers */}
                <div className="flex flex-col items-center sm:items-start">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Foll</span>
                    <span className="font-semibold text-white">{user.followersCount || 0}</span>
                </div>

                {/* Limit (Hourly focus) */}
                <div className="flex flex-col items-center sm:items-center justify-center bg-gray-800 rounded px-2 py-1 border border-gray-600">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">Hourly</span>
                    <button
                        onClick={() => onEditLimit(user)}
                        className="font-bold text-blue-400 hover:text-blue-300 hover:underline text-sm"
                        title="Click to edit Hourly Limit"
                    >
                        {user.rateLimitHourly !== null && user.rateLimitHourly !== undefined
                            ? user.rateLimitHourly
                            : 'Def'}
                    </button>
                </div>
            </div>
        </div>
    );
};

UserCard.propTypes = {
    user: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        avatar: PropTypes.string,
        isGoldenMember: PropTypes.bool,
        username: PropTypes.string.isRequired,
        isVerified: PropTypes.bool,
        createdAt: PropTypes.string,
        predictionCount: PropTypes.number,
        avgRating: PropTypes.number,
        followersCount: PropTypes.number,
        rateLimitHourly: PropTypes.number,
        customPredictionLimit: PropTypes.number
    }).isRequired,
    onEditLimit: PropTypes.func.isRequired
};

// --- Main Component ---
const AdminUserList = ({ settings }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'golden', 'verified', 'bot'
    const [sort, setSort] = useState('username-asc');
    const [visibleCount, setVisibleCount] = useState(10);
    const [refreshKey, setRefreshKey] = useState(0);

    // Modal State
    const [editingUser, setEditingUser] = useState(null);

    // Fetch users
    useEffect(() => {
        setLoading(true);
        const [sortBy, order] = sort.split('-');

        const params = {
            sortBy,
            order,
            ...(filter === 'golden' && { isGoldenMember: 'true' }),
            ...(filter === 'verified' && { isVerified: 'true' }),
            ...(filter === 'bot' && { isBot: 'true' }),
            ...(filter === 'regular' && { isGoldenMember: 'false', isVerified: 'false', isBot: 'false' }),
        };

        axios.get(`${import.meta.env.VITE_API_URL}/api/admin/all-users`, { params, withCredentials: true })
            .then(res => {
                setUsers(res.data);
            })
            .catch(() => toast.error("Could not fetch user list."))
            .finally(() => setLoading(false));
    }, [filter, sort, refreshKey]);

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    // Save Limit via Modal
    const handleSaveLimit = async (newHourlyLimit) => {
        if (!editingUser) return;

        try {
            // We only update the hourlyLimit
            await axios.put(
                `${import.meta.env.VITE_API_URL}/api/admin/users/${editingUser._id}/limit`,
                { hourlyLimit: newHourlyLimit },
                { withCredentials: true }
            );

            toast.success(`Limit updated for ${editingUser.username}`);
            setEditingUser(null);
            handleRefresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update limit.");
        }
    };

    const usersToDisplay = useMemo(() => users.slice(0, visibleCount), [users, visibleCount]);

    return (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white">User Management</h2>
                    <span className="text-gray-400 font-semibold text-sm">Total: {users.length}</span>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    {/* Filters */}
                    <div className="flex bg-gray-900 p-1 rounded-md overflow-x-auto">
                        {['all', 'regular', 'golden', 'verified', 'bot'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1 text-xs font-bold rounded capitalize whitespace-nowrap ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Sort */}
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="bg-gray-900 text-white text-sm p-2 rounded-md border border-gray-700 outline-none focus:border-blue-500"
                    >
                        <option value="username-asc">Name (A-Z)</option>
                        <option value="createdAt-desc">Joined (Newest)</option>
                        <option value="createdAt-asc">Joined (Oldest)</option>
                        <option value="predictionCount-desc">Most Predictions</option>
                        <option value="followersCount-desc">Most Followers</option>
                        <option value="avgRating-desc">Highest Accuracy</option>
                    </select>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center text-gray-400 py-12">Loading...</div>
            ) : (
                <div className="space-y-3">
                    {usersToDisplay.length > 0 ? (
                        usersToDisplay.map(user => (
                            <UserCard
                                key={user._id}
                                user={user}
                                onEditLimit={setEditingUser}
                            />
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-8">No users found.</p>
                    )}
                </div>
            )}

            {/* Load More */}
            {visibleCount < users.length && (
                <div className="mt-6 flex justify-center">
                    <LoadMoreButton
                        onClick={() => setVisibleCount(prev => prev + 10)}
                        hasMore={visibleCount < users.length}
                    />
                </div>
            )}

            {/* Edit Modal */}
            <LimitEditModal
                isOpen={!!editingUser}
                user={editingUser}
                currentHourlyLimit={editingUser?.rateLimitHourly}
                onClose={() => setEditingUser(null)}
                onSave={handleSaveLimit}
            />
        </div>
    );
};

AdminUserList.propTypes = {
    settings: PropTypes.object
};

export default AdminUserList;