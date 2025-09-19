import React from 'react';
import { Link } from 'react-router-dom';

const CommunityFeed = ({ feedItems = [], className = '' }) => (
     <div className={`bg-gray-800 p-6 rounded-lg shadow-lg ${className}`}>
        <div className="flex items-center mb-4">
            <svg className="w-6 h-6 text-indigo-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V4a2 2 0 012-2h8a2 2 0 012 2v4z"></path></svg>
            <h3 className="text-xl font-bold text-white">Community Feed</h3>
        </div>
        <div className="space-y-4">
            {feedItems.length > 0 ? feedItems.map(item => (
                // Each item is now a clickable link to its detail page
                <Link to={`/prediction/${item.id}`} key={item.id} className="block text-sm text-gray-300 border-l-2 border-green-500 pl-3 hover:bg-gray-700 rounded-r-md transition-colors">
                    {item.text}
                </Link>
            )) : <p className="text-gray-500 text-center py-4">No recent predictions.</p>}
        </div>
    </div>
);

export default CommunityFeed;