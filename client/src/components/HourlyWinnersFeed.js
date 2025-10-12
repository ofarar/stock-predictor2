import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
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
                    <svg className="w-6 h-6 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 className="text-xl font-bold text-white">{t('hourlyWinnersFeed.title')}</h3>
                </div>
                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-md">
                    {marketIsOpen 
                        ? t('hourlyWinnersFeed.nextResults', { timeLeft }) 
                        : t('hourlyWinnersFeed.marketClosed')}
                </span>
            </div>
            <div className="space-y-3">
                {winners.length > 0 ? winners.map((winner) => (
                    <div key={winner.predictionId} className="flex items-center bg-gray-700 p-3 rounded-lg">
                        <img 
                            src={winner.avatar || `https://avatar.iran.liara.run/public/boy?username=${winner.userId}`} 
                            alt="avatar" 
                            className={`w-10 h-10 rounded-full border-2 ${winner.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`}
                        />
                        <Link to={`/profile/${winner.userId}`} className="font-semibold text-white hover:underline ml-4 flex-grow">
                            {winner.username}
                        </Link>
                        <Link to={`/stock/${winner.ticker}`} className="text-sm text-gray-400 hover:underline mx-4">{winner.ticker}</Link>
                        <span className="font-bold text-green-400">
                            {t('hourlyWinnersFeed.pointsSuffix', { score: winner.score })}
                        </span>
                    </div>
                )) : <p className="text-center text-gray-500 py-4">{t('hourlyWinnersFeed.noPredictions')}</p>}
            </div>
        </div>
    );
};

export default HourlyWinnersFeed;
