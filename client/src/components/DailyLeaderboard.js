import React from 'react';
import { Link } from 'react-router-dom';

const DailyLeaderboard = ({ leaders = [] }) => (
    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
        <div className="flex items-center mb-4">
            <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            <h3 className="text-xl font-bold text-white">Today's Top Performers</h3>
        </div>
        <p className="text-sm text-gray-400 mb-4">(Based on today's hourly predictions)</p>
        <div className="space-y-3">
            {leaders.length > 0 ? leaders.map((leader) => (
                <div key={leader.userId} className="flex items-center bg-gray-700 p-3 rounded-lg">
                    <img 
                        src={leader.avatar || `https://avatar.iran.liara.run/public/boy?username=${leader.userId}`}
                        alt="avatar"
                        className={`w-10 h-10 rounded-full border-2 ${leader.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`}
                    />
                    <Link to={`/profile/${leader.userId}`} className="font-semibold text-white hover:underline ml-4 flex-grow">{leader.username}</Link>
                    <span className="ml-auto font-bold text-green-400">{leader.avgScore.toFixed(1)} avg</span>
                </div>
            )) : <p className="text-gray-500 text-center py-4">No data yet today.</p>}
        </div>
    </div>
);

export default DailyLeaderboard;