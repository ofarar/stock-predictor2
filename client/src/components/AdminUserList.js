import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import VerifiedTick from './VerifiedTick';

const UserCard = ({ user, settings }) => (
    <Link
        to={`/profile/${user._id}`}
        className="bg-gray-700 p-4 rounded-lg flex items-center gap-4 transition-colors hover:bg-gray-600"
    >
        {/* Left side: avatar + name under it */}
        <div className="flex flex-col items-center w-20 sm:w-24 md:w-28 flex-shrink-0">
            <img
                src={user.avatar}
                alt="avatar"
                className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-4 ${user.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`}
            />
            <div className="flex items-center mt-2 max-w-full">
                <p className="font-bold text-white text-center break-words line-clamp-2">
                    {user.username}
                </p>
                {settings?.isVerificationEnabled && user.isVerified && (
                    <VerifiedTick className="ml-1 flex-shrink-0" />
                )}
            </div>
        </div>

        {/* Right side: stats */}
        <div className="flex-grow grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
            <div className="text-center">
                <p className="text-xs text-gray-400">Followers</p>
                <p className="font-bold text-white">{user.followersCount}</p>
            </div>
            <div className="text-center">
                <p className="text-xs text-gray-400">Predictions</p>
                <p className="font-bold text-white">{user.predictionCount}</p>
            </div>
            <div className="text-center">
                <p className="text-xs text-gray-400">Avg Score</p>
                <p className="font-bold text-green-400">{user.avgScore}</p>
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



const AdminUserList = ({ settings }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'golden', 'verified'
    const [sort, setSort] = useState('username-asc'); // e.g., 'followersCount-desc'
    const [visibleCount, setVisibleCount] = useState(10); // Load More state

    useEffect(() => {
        setLoading(true);
        const [sortBy, order] = sort.split('-');

        const params = {
            sortBy,
            order,
            isGoldenMember: filter === 'golden' ? 'true' : '',
            isVerified: filter === 'verified' ? 'true' : '',
        };

        axios.get(`${process.env.REACT_APP_API_URL}/api/admin/all-users`, { params, withCredentials: true })
            .then(res => setUsers(res.data))
            .catch(() => toast.error("Could not fetch user list."))
            .finally(() => setLoading(false));
    }, [filter, sort]);

    const filteredUsers = useMemo(() => users, [users]);

    return (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">User Management</h2>
                    <span className="text-gray-400 font-semibold">Total: {filteredUsers.length}</span>
                </div>

                {/* --- Filter & Sort Controls --- */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                    <div className="flex gap-2 bg-gray-900 p-1 rounded-md justify-center">
                        <button onClick={() => setFilter('all')} className={`px-4 py-1 text-sm font-bold rounded w-full ${filter === 'all' ? 'bg-green-500 text-white' : 'text-gray-300'}`}>All Users</button>
                        <button onClick={() => setFilter('golden')} className={`px-4 py-1 text-sm font-bold rounded w-full ${filter === 'golden' ? 'bg-yellow-500 text-black' : 'text-gray-300'}`}>Golden Members</button>
                        <button onClick={() => setFilter('verified')} className={`px-3 py-1 text-sm font-bold rounded ${filter === 'verified' ? 'bg-green-500 text-white' : 'text-gray-300'}`}>Verified</button>
                    </div>
                    <div>
                        <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full bg-gray-900 text-white p-2 rounded-md h-full">
                            <option value="username-asc">Sort by Username (A-Z)</option>
                            <option value="predictionCount-desc">Sort by Predictions</option>
                            <option value="avgScore-desc">Sort by Avg Score</option>
                            <option value="followersCount-desc">Sort by Followers</option>
                            <option value="goldenSubscribersCount-desc">Sort by Subscribers</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center text-gray-400 py-8">Loading users...</div>
            ) : (
                <>
                    <div className="space-y-4">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.slice(0, visibleCount).map(user => (
                                <UserCard key={user._id} user={user} settings={settings} />
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-8">No users found.</p>
                        )}
                    </div>

                    {/* Load More Button */}
                    {visibleCount < filteredUsers.length && (
                        <div className="text-center mt-6">
                            <button
                                onClick={() => setVisibleCount(prev => prev + 10)}
                                className="bg-gray-700 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600"
                            >
                                Load More
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminUserList;
