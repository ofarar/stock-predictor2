// src/components/TopMovers.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const TopMovers = () => {
    const { t } = useTranslation();
    const [movers, setMovers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/api/market/top-movers`)
            .then(res => setMovers(res.data))
            .catch(err => console.error("Failed to fetch top movers", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        // Simple loading state
        return <div className="bg-gray-800 p-6 rounded-lg shadow-lg"><p className="text-gray-400">{t('topMovers.loading')}</p></div>;
    }

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4">{t('topMovers.title')}</h3>
            <div className="space-y-4">
                {movers.map(mover => (
                    <div key={mover.ticker} className="flex justify-between items-center">
                        <div>
                            <Link to={`/stock/${mover.ticker}`} className="font-bold text-white hover:underline">{mover.ticker}</Link>
                            <p className="text-sm text-gray-400">${mover.price}</p>
                        </div>
                        <span className={`font-semibold px-2 py-1 rounded-md text-sm ${mover.isUp ? 'bg-green-500 bg-opacity-20 text-green-400' : 'bg-red-500 bg-opacity-20 text-red-400'}`}>
                            {mover.percentChange}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TopMovers;