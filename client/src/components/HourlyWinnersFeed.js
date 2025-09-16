import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const HourlyWinnersFeed = ({ winners = [] }) => { // Receives winners as a prop
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const timer = setInterval(() => {
            const minutes = 59 - new Date().getMinutes();
            const seconds = 59 - new Date().getSeconds();
            setTimeLeft(`${minutes}m ${seconds}s`);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Last Hour's Winners</h3>
                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-md">Next results in: {timeLeft}</span>
            </div>
            <div className="space-y-3">
                {winners.length > 0 ? winners.map(winner => (
                    <div key={winner.userId} className="flex justify-between items-center bg-gray-700 p-2 rounded-lg">
                        <Link to={`/profile/${winner.userId}`} className="font-semibold text-white hover:underline">{winner.username}</Link>
                        <Link to={`/stock/${winner.ticker}`} className="text-sm text-gray-400 hover:underline">{winner.ticker}</Link>
                        <span className="font-bold text-green-400">+{winner.score} pts</span>
                    </div>
                )) : <p className="text-center text-gray-500 py-4">No predictions assessed in the last hour.</p>}
            </div>
        </div>
    );
};

export default HourlyWinnersFeed;