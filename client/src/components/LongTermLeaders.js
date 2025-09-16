import React from 'react';
import { Link } from 'react-router-dom';

const LongTermLeaders = ({ leaders = [] }) => (
    <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-xl font-bold text-white mb-4">Long-Term Leaders</h3>
        <div className="space-y-3">
            {leaders.length > 0 ? leaders.map((leader) => (
                <Link to={`/profile/${leader.userId}`} key={leader.userId} className="flex justify-between items-center bg-gray-700 p-2 rounded-lg">
                    <span className="font-semibold text-white">{leader.username}</span>
                    <span className="font-bold text-green-400">{leader.accuracy}% Acc</span>
                </Link>
            )) : <p className="text-gray-500 text-center py-4">No data yet.</p>}
        </div>
    </div>
);

export default LongTermLeaders;