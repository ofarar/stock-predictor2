// src/components/UserScoreSkeleton.js

import React from 'react';

const UserScoreSkeleton = () => (
    <div className="bg-gray-800 rounded-lg p-3 sm:p-4 flex items-center justify-between animate-pulse">
        <div className="flex items-center">
            <div className="w-8 h-6 bg-gray-700 rounded-md"></div>
            <div className="w-10 h-10 rounded-full ms-2 sm:ml-4 bg-gray-700"></div>
            <div className="ms-3 sm:ml-4 h-5 w-32 bg-gray-700 rounded-md"></div>
        </div>
        <div className="text-end">
            <div className="h-6 w-16 bg-gray-700 rounded-md"></div>
            <div className="h-3 w-12 bg-gray-700 rounded-md mt-2"></div>
        </div>
    </div>
);

export default UserScoreSkeleton;