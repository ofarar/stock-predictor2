// src/components/MarketWatch.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { formatPercentage, formatCurrency } from '../utils/formatters';
import Tooltip from './Tooltip';

const MarketWatch = () => {
    const { t, i18n } = useTranslation();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Call the new backend endpoint
        axios.get(`${process.env.REACT_APP_API_URL}/api/market/key-assets`)
            .then(res => setAssets(res.data))
            .catch(err => console.error("Failed to fetch key assets", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="bg-gray-800 p-6 rounded-lg shadow-lg"><p className="text-gray-400">{t('topMovers.loading')}</p></div>;
    }

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4">{t('market_watch.title')}</h3>
            <div className="space-y-4">
                {assets.map(asset => (
                    <div key={asset.ticker} className="flex justify-between items-center">
                        <div>
                            {/* Link uses the ticker, but text shows the friendly name */}
                            <Link to={`/stock/${asset.ticker}`} className="font-bold text-white hover:underline">{asset.name}</Link>
                            <Tooltip text={t('common.dataDelayed')}>
                                <p className="text-sm text-gray-400">
                                    {formatCurrency(asset.price, i18n.language, asset.currency)}
                                </p>
                            </Tooltip>
                        </div>
                        <span className={`font-semibold px-2 py-1 rounded-md text-sm ${asset.isUp ? 'bg-green-500 bg-opacity-20 text-green-400' : 'bg-red-500 bg-opacity-20 text-red-400'}`}>
                            {formatPercentage(asset.percentChange, i18n.language)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MarketWatch;