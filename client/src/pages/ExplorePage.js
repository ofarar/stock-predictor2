import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import StockFilterSearch from '../components/StockFilterSearch';
import DescriptionModal from '../components/DescriptionModal';
import toast from 'react-hot-toast';
import VerifiedTick from '../components/VerifiedTick';
import { useTranslation } from 'react-i18next';
import { formatPercentage, formatCurrency, formatDate } from '../utils/formatters';

const PredictionCard = ({ prediction, onInfoClick, onVote, currentUser, navigate, settings }) => {
    const { t, i18n } = useTranslation();

    if (!prediction.userId) return null;

    const isAssessed = prediction.status === 'Assessed';
    const percentChange = !isAssessed && prediction.currentPrice > 0 ? ((prediction.targetPrice - prediction.currentPrice) / prediction.currentPrice) * 100 : 0;

    const likes = prediction.likes || [];
    const dislikes = prediction.dislikes || [];

    const userLike = currentUser && likes.includes(currentUser._id);
    const userDislike = currentUser && dislikes.includes(currentUser._id);

    return (
        <div
            onClick={() => navigate(`/prediction/${prediction._id}`)}
            className="block bg-gray-800 rounded-lg transition-all hover:shadow-lg hover:shadow-green-500/10 flex flex-col cursor-pointer"
        >
            <div className="p-4 flex-grow">
                <div className="flex items-center mb-4">
                    <img src={prediction.userId.avatar || `https://avatar.iran.liara.run/public/boy?username=${prediction.userId._id}`} alt="avatar" className={`w-10 h-10 rounded-full border-2 ${prediction.userId.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`} />

                    <div className="ml-3 flex-grow">
                        <div className="flex items-center gap-2">
                            <Link to={`/profile/${prediction.userId._id}`} onClick={(e) => e.stopPropagation()} className="font-bold text-white hover:underline">{prediction.userId.username}</Link>
                            {settings?.isVerificationEnabled && prediction.userId.isVerified && <VerifiedTick />}
                        </div>
                        <p className="text-xs text-gray-400">@{prediction.userId.username}</p>
                    </div>
                    <Link to={`/stock/${prediction.stockTicker}`} onClick={(e) => e.stopPropagation()} className="ml-auto text-lg font-bold text-white bg-gray-700 px-3 py-1 rounded-md hover:bg-gray-600">{prediction.stockTicker}</Link>
                </div>
                {isAssessed ? (
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div><p className="text-xs text-gray-400">{t('explore_predicted')}</p><p className="font-semibold text-white">
                            {formatCurrency(prediction.targetPrice, i18n.language, prediction.currency)}
                        </p></div>
                        <div><p className="text-xs text-gray-400">{t('explore_actual_price')}</p><p className="font-bold text-lg text-green-400">
                            {formatCurrency(prediction.actualPrice || 0, i18n.language, prediction.currency)}
                        </p></div>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-gray-300">{t('explore_predicts_price_of')}</p>
                        <div className="flex justify-center items-center gap-2">
                            <p className="text-3xl font-bold text-green-400 my-2">${prediction.targetPrice.toFixed(2)}</p>
                            <p className={`text-lg font-bold ${percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ({formatPercentage(percentChange, i18n.language)})
                            </p>
                            {prediction.description && (
                                <button onClick={(e) => { e.stopPropagation(); onInfoClick(prediction.description); }} className="text-gray-500 hover:text-white" title={t('explore_view_rationale')}>
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-gray-500">
                            {t('explore_by_deadline', { date: formatDate(new Date(prediction.deadline), i18n.language) })}
                        </p>
                    </div>
                )}
            </div>
            <div className="flex justify-between items-center text-xs px-4 py-2 bg-gray-700">
                <span className="font-semibold text-gray-300">
                    {t(`predictionTypes.${prediction.predictionType.toLowerCase()}`)}
                </span>
                <div className="flex items-center gap-3 text-gray-400">
                    <button onClick={(e) => { e.stopPropagation(); onVote(prediction._id, 'like'); }} className={`flex items-center gap-1 font-bold hover:text-white ${userLike ? 'text-green-500' : ''}`} disabled={isAssessed} title={t('explore_agree')}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.562 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"></path></svg>
                        <span>{likes.length}</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onVote(prediction._id, 'dislike'); }} className={`flex items-center gap-1 font-bold hover:text-white ${userDislike ? 'text-red-500' : ''}`} disabled={isAssessed} title={t('explore_disagree')}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.106-1.79l-.05-.025A4 4 0 0011.057 2H5.641a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.438 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.2-1.867a4 4 0 00.8-2.4z"></path></svg>
                        <span>{dislikes.length}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const ExplorePage = ({ requestLogin, settings }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Active');
    const [filters, setFilters] = useState({ stock: '', predictionType: 'All', sortBy: 'date', verifiedOnly: false });
    const [descModal, setDescModal] = useState({ isOpen: false, description: '' });
    const [currentUser, setCurrentUser] = useState(null);

    const predictionTypes = ['All', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true })
            .then(res => setCurrentUser(res.data));
    }, []);

    const fetchPredictions = useCallback(() => {
        setLoading(true);
        const apiSortBy = filters.sortBy === 'potential' ? 'date' : filters.sortBy;
        axios.get(`${process.env.REACT_APP_API_URL}/api/explore/feed`, { params: { status: activeTab, ...filters, sortBy: apiSortBy } })
            .then(res => {
                let data = res.data;
                if (filters.sortBy === 'potential' && activeTab === 'Active') {
                    data.sort((a, b) => {
                        const changeA = a.currentPrice > 0 ? Math.abs((a.targetPrice - a.currentPrice) / a.currentPrice) : 0;
                        const changeB = b.currentPrice > 0 ? Math.abs((b.targetPrice - b.currentPrice) / b.currentPrice) : 0;
                        return changeB - changeA;
                    });
                }
                setPredictions(data);
            })
            .catch(err => console.error("Failed to fetch predictions feed", err))
            .finally(() => setLoading(false));
    }, [activeTab, filters]);

    useEffect(() => { fetchPredictions(); }, [fetchPredictions]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleVote = (predictionId, voteType) => {
        if (!currentUser) return requestLogin();
        const originalPredictions = [...predictions];
        const updatedPredictions = predictions.map(p => {
            if (p._id === predictionId) {
                const newPrediction = { ...p, likes: [...(p.likes || [])], dislikes: [...(p.dislikes || [])] };
                const userId = currentUser._id;
                const userLikesIndex = newPrediction.likes.indexOf(userId);
                const userDislikesIndex = newPrediction.dislikes.indexOf(userId);
                if (voteType === 'like') {
                    if (userLikesIndex !== -1) newPrediction.likes.splice(userLikesIndex, 1);
                    else {
                        newPrediction.likes.push(userId);
                        if (userDislikesIndex !== -1) newPrediction.dislikes.splice(userDislikesIndex, 1);
                    }
                } else {
                    if (userDislikesIndex !== -1) newPrediction.dislikes.splice(userDislikesIndex, 1);
                    else {
                        newPrediction.dislikes.push(userId);
                        if (userLikesIndex !== -1) newPrediction.likes.splice(userLikesIndex, 1);
                    }
                }
                return newPrediction;
            }
            return p;
        });
        setPredictions(updatedPredictions);
        axios.post(`${process.env.REACT_APP_API_URL}/api/predictions/${predictionId}/${voteType}`, {}, { withCredentials: true })
            .catch(() => {
                toast.error(t('explore_vote_failed'));
                setPredictions(originalPredictions);
            });
    };

    return (
        <>
            <DescriptionModal isOpen={descModal.isOpen} onClose={() => setDescModal({ isOpen: false, description: '' })} description={descModal.description} />
            <div className="animate-fade-in">
                <h1 className="text-3xl font-bold text-white mb-6">{t('explore_title')}</h1>
                <div className="bg-gray-800 p-4 rounded-lg mb-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">{t('explore_filter_stock')}</label>
                            <StockFilterSearch onStockSelect={(stock) => handleFilterChange('stock', stock)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">{t('explore_prediction_type')}</label>
                            <select onChange={(e) => handleFilterChange('predictionType', e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                                {predictionTypes.map(type => (
                                    <option key={type} value={type}>
                                        {t(`predictionTypes.${type.toLowerCase()}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">{t('explore_sort_by')}</label>
                            <select onChange={(e) => handleFilterChange('sortBy', e.target.value)} value={filters.sortBy} className="w-full bg-gray-700 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                                <option value="date">{t('explore_sort_by_date')}</option>
                                <option value="performance">{t('explore_sort_by_performance')}</option>
                                <option value="votes">{t('explore_sort_by_votes')}</option>
                                {activeTab === 'Active' && <option value="potential">{t('explore_sort_by_potential')}</option>}
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center justify-center pt-2">
                        <input
                            type="checkbox"
                            id="verifiedOnly"
                            checked={filters.verifiedOnly}
                            onChange={(e) => handleFilterChange('verifiedOnly', e.target.checked)}
                            className="h-4 w-4 rounded bg-gray-700 text-green-500"
                        />
                        <label htmlFor="verifiedOnly" className="ml-2 text-sm font-medium text-gray-300">{t('explore_verified_only')}</label>
                    </div>
                </div>
                <div className="flex border-b border-gray-700 mb-6">
                    <button onClick={() => setActiveTab('Active')} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'Active' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>{t('explore_tab_active')}</button>
                    <button onClick={() => setActiveTab('Assessed')} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'Assessed' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>{t('explore_tab_assessed')}</button>
                </div>
                {loading ? (<p className="text-center text-gray-400 py-10">{t('explore_loading')}</p>) : (
                    <>
                        {predictions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {predictions.map(p => <PredictionCard
                                    key={p._id}
                                    prediction={p}
                                    onInfoClick={(desc) => setDescModal({ isOpen: true, description: desc })}
                                    onVote={handleVote}
                                    currentUser={currentUser}
                                    navigate={navigate}
                                    settings={settings}
                                />)}
                            </div>
                        ) : (<div className="text-center bg-gray-800 rounded-lg py-20"><p className="text-lg font-semibold text-gray-400">{t('explore_no_predictions')}</p></div>)}
                    </>
                )}
            </div>
        </>
    );
};

export default ExplorePage;
