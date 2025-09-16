import React from 'react';

const CommunityFeed = ({ feedItems = [] }) => (
     <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-bold text-white mb-4">Community Feed</h3>
        <div className="space-y-4">
            {feedItems.length > 0 ? feedItems.map(item => (
                <div key={item.id} className="text-sm text-gray-300 border-l-2 border-green-500 pl-3">
                    {item.text}
                </div>
            )) : <p className="text-gray-500 text-center py-4">No recent predictions.</p>}
        </div>
    </div>
);

export default CommunityFeed;