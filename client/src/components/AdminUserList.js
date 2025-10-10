import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const UserCard = ({ user }) => (
    <Link to={`/profile/${user._id}`} className="bg-gray-700 p-4 rounded-lg flex items-center gap-4 transition-colors hover:bg-gray-600">
        <img 
            src={user.avatar} 
            alt="avatar" 
            className={`w-14 h-14 rounded-full border-4 flex-shrink-0 ${user.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`}
        />
        <div className="flex-grow grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
            <p className="font-bold text-white truncate col-span-2 md:col-span-1">{user.username}</p>
            
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

const AdminUserList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'golden'
    const [sort, setSort] = useState('username-asc'); // e.g., 'followersCount-desc'

    useEffect(() => {
        setLoading(true);
        const [sortBy, order] = sort.split('-');
        
        const params = {
            sortBy,
            order,
            isGoldenMember: filter === 'golden' ? 'true' : ''
        };

        axios.get(`${process.env.REACT_APP_API_URL}/api/admin/all-users`, { params, withCredentials: true })
            .then(res => setUsers(res.data))
            .catch(() => toast.error("Could not fetch user list."))
            .finally(() => setLoading(false));
    }, [filter, sort]);

    const filteredUsers = useMemo(() => {
        // The backend now does the filtering and sorting, but we keep this for the count display
        return users;
    }, [users]);

    return (
        <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-white">User Management ({filteredUsers.length})</h2>
                <div className="flex items-center gap-4">
                    {/* --- Filter Toggles --- */}
                    <div className="flex gap-2 bg-gray-900 p-1 rounded-md">
                        <button onClick={() => setFilter('all')} className={`px-4 py-1 text-sm font-bold rounded ${filter === 'all' ? 'bg-green-500 text-white' : 'text-gray-300'}`}>
                            All Users
                        </button>
                        <button onClick={() => setFilter('golden')} className={`px-4 py-1 text-sm font-bold rounded ${filter === 'golden' ? 'bg-yellow-500 text-black' : 'text-gray-300'}`}>
                            Golden Members
                        </button>
                    </div>
                    {/* --- Sort Dropdown --- */}
                    <div>
                         <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-gray-900 text-white p-2 rounded-md">
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
                <div className="space-y-4">
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => <UserCard key={user._id} user={user} />)
                    ) : (
                        <p className="text-center text-gray-500 py-8">No users found.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminUserList;