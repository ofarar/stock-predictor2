import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// We'll use the same helper function to check market hours
const isMarketOpen = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const day = now.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;
    const isMarketHours = utcHour > 13 || (utcHour === 13 && now.getUTCMinutes() >= 30);
    const isBeforeClose = utcHour < 20;
    return isWeekday && isMarketHours && isBeforeClose;
};

const HourlyWinnersFeed = ({ winners = [] }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [marketIsOpen, setMarketIsOpen] = useState(isMarketOpen());

    useEffect(() => {
        const timer = setInterval(() => {
            const currentlyOpen = isMarketOpen();
            setMarketIsOpen(currentlyOpen);

            if (currentlyOpen) {
                const minutes = 59 - new Date().getMinutes();
                const seconds = 59 - new Date().getSeconds();
                setTimeLeft(`${minutes}m ${seconds}s`);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                    {/* Icon Added */}
                    <svg className="w-6 h-6 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <h3 className="text-xl font-bold text-white">Last Hour's Winners</h3>
                </div>
                {/* Conditionally display the timer or a "Market Closed" message */}
                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-md">
                    {marketIsOpen ? `Next results in: ${timeLeft}` : 'Market Closed'}
                </span>
            </div>
            <div className="space-y-3">
                {winners.length > 0 ? winners.map(winner => (
                    // Use the unique predictionId for the key instead of userId
                    <div key={winner.predictionId} className="flex justify-between items-center bg-gray-700 p-2 rounded-lg">
                        <Link to={`/profile/${winner.userId}`} className="font-semibold text-white hover:underline">{winner.username}</Link>
                        <Link to={`/stock/${winner.ticker}`} className="text-sm text-gray-400 hover:underline">{winner.ticker}</Link>
                        <span className="font-bold text-green-400">+{winner.score} pts</span>
                    </div>
                )) : <p className="text-center text-gray-500 py-4">No predictions assessed yet.</p>}
            </div>
        </div>
    );
};

export default HourlyWinnersFeed;