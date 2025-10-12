import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import StockFilterSearch from '../components/StockFilterSearch';
import UserScoreSkeleton from '../components/UserScoreSkeleton';
import VerifiedTick from '../components/VerifiedTick';
import { useTranslation } from 'react-i18next';

const ScoreboardPage = ({ settings }) => {
    const { t } = useTranslation();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchParams] = useSearchParams();
    const initialStock = searchParams.get('stock') || '';
    const initialType = searchParams.get('predictionType') || 'Overall';

    const [predictionTypeFilter, setPredictionTypeFilter] = useState(initialType);
    const [stockFilter, setStockFilter] = useState(initialStock);

    const predictionTypes = ['Overall', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

    const fetchScoreboard = useCallback(() => {
        setLoading(true);
        axios.get(`${process.env.REACT_APP_API_URL}/api/scoreboard`, {
            params: {
                predictionType: predictionTypeFilter,
                stock: stockFilter
            }
        })
            .then(res => setUsers(res.data))
            .catch(() => toast.error(t('msg_loading_scoreboard_error')))
            .finally(() => setLoading(false));
    }, [predictionTypeFilter, stockFilter, t]);

    useEffect(() => {
        fetchScoreboard();
    }, [fetchScoreboard]);

    return (
        <div className="w-full max-w-4xl mx-auto animate-fade-in px-4">
            <h1 className="text-3xl font-bold text-white mb-6 text-center">{t('title_top_performers')}</h1>

            <div className="bg-gray-800 p-4 rounded-lg mb-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">{t('label_prediction_type')}</label>
                        <select
                            value={predictionTypeFilter}
                            onChange={e => setPredictionTypeFilter(e.target.value)}
                            className="w-full bg-gray-700 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            {predictionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">{t('label_filter_by_stock')}</label>
                        <StockFilterSearch onStockSelect={setStockFilter} initialValue={stockFilter} />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 10 }).map((_, index) => <UserScoreSkeleton key={index} />)}
                </div>
            ) : (
                <div className="space-y-3">
                    {users.length > 0 ? users.map((user) => (
                        <div key={user._id} className="bg-gray-800 rounded-lg p-3 sm:p-4 flex items-center justify-between transition-colors hover:bg-gray-700">
                            <div className="flex items-center">
                                <img
                                    src={user.avatar || `https://avatar.iran.liara.run/public/boy?username=${user._id}`}
                                    alt="avatar"
                                    className={`w-12 h-12 rounded-full border-2 ${user.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`}
                                />
                                <div className="flex items-center gap-2 ml-4">
                                    <Link to={`/profile/${user._id}`} className="font-semibold text-white text-lg hover:underline">
                                        {user.username}
                                    </Link>
                                    {settings?.isVerificationEnabled && user.isVerified && <VerifiedTick />}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-green-400 text-xl">{user.avgScore}</span>
                                <p className="text-xs text-gray-400">{t('text_avg_score')}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center text-gray-500 py-10">
                            <p className="text-lg font-semibold">{t('msg_no_users_found')}</p>
                            <p>{t('msg_try_broaden_search')}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ScoreboardPage;
