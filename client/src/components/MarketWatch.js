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
        axios.get(`${process.env.REACT_APP_API_URL}/api/market/key-assets`)
            .then(res => setAssets(res.data))
            .catch(err => {
                console.error("Failed to fetch key assets", err);
                setAssets([]); // Ensure assets is an empty array on error
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-white mb-4">{t('market_watch.title')}</h3>
            
            {loading ? (
                <div className="text-center text-gray-400 py-4">{t('topMovers.loading')}</div>
            ) : assets.length > 0 ? (
                <div className="space-y-4">
                    {assets.map(asset => (
                        <div key={asset.ticker} className="flex justify-between items-center">
                            <div>
                                <Link to={`/stock/${asset.ticker}`} className="font-bold text-white hover:underline">{asset.name}</Link>
                                <Tooltip text={t('common.dataDelayed')}>
                                    <p className="text-sm text-gray-400">
                                        {formatCurrency(asset.price, i18n.language, asset.currency)}
                                    </p>
                                </Tooltip>
                            </div>
                            <span className={`font-semibold px-2 py-1 rounded-md text-sm ${asset.isUp ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {formatPercentage(asset.percentChange, i18n.language)}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500 py-4">
                    <p>{t('market_watch.unavailable', 'Live market data is temporarily unavailable.')}</p>
                </div>
            )}
        </div>
    );
};

export default MarketWatch;