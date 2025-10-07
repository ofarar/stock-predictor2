import React from 'react';

const TimePenaltyBar = ({ message, barWidth }) => {
    return (
        <div className="mb-4">
            <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                <span>Time Bonus</span>
                <span className="font-bold text-white">{message}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                    className="bg-green-500 h-2.5 rounded-full" 
                    style={{ width: barWidth, transition: 'width 0.5s ease-in-out' }}
                ></div>
            </div>
        </div>
    );
};

export default TimePenaltyBar;