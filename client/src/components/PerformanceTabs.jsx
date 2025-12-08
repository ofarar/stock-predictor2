// src/components/PerformanceTabs.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaShareAlt } from 'react-icons/fa';
import ShareModal from './ShareModal';
import LoadMoreButton from './LoadMoreButton';
import PerformanceDetailModal from './PerformanceDetailModal';
import { getShareBaseUrl } from '../utils/urlHelper';

const StatCard = ({ label, avgRating, rank, isStock, isSelected, onClick, onShareClick }) => {
    const { t } = useTranslation();
    const circumference = 2 * Math.PI * 20;
    const validAvgRating = avgRating || 0;
    const offset = circumference - (avgRating / 100) * circumference;

    const handleShare = (e) => {
        e.stopPropagation();
        onShareClick();
    };

    return (
        <div
            onClick={onClick}
            className={`flex flex-col bg-gray-700 p-4 rounded-lg transition-all duration-200 cursor-pointer hover:scale-[1.02]`}
        >
            <div className="flex items-center flex-grow">
                <div className="relative w-12 h-12 flex-shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 44 44">
                        <circle className="text-gray-600" strokeWidth="4" stroke="currentColor" fill="transparent" r="20" cx="22" cy="22" />
                        <circle className="text-green-400" strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r="20" cx="22" cy="22" transform="rotate(-90 22 22)" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                        {validAvgRating.toFixed(1)}
                    </span>
                </div>
                <div className="ms-4 flex-grow">
                    {isStock ? (
                        <Link to={`/stock/${label}`} className="font-bold text-white text-lg hover:underline" onClick={e => e.stopPropagation()}>{label}</Link>
                    ) : (
                        <p className="font-bold text-white text-lg">{label}</p>
                    )}
                    <p className="text-sm text-gray-400">{t('performanceTabs.statCard.averageRating')}</p>
                </div>
                <div className="relative flex flex-col items-center justify-center bg-gray-800 rounded-md p-2 ms-2 text-center w-20">
                    {rank <= 3 && (<span className="absolute -top-2 -right-2 text-2xl" title={t('performanceTabs.statCard.topRankTitle', { rank })}>⭐</span>)}
                    <p className="text-xs text-blue-400 font-bold">{t('performanceTabs.statCard.rank')}</p>
                    <p className="text-xl font-bold text-white">#{rank}</p>
                </div>
            </div>

            <div className="flex justify-end mt-2">
                <button
                    onClick={handleShare}
                    className="text-gray-500 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-gray-600"
                    title={t('shareModal.title')}
                >
                    <FaShareAlt />
                </button>
            </div>
        </div>
    );
};

const PerformanceTabs = ({ performance, predictions, onFilterChange }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('ByType');
    const [selectedFilter, setSelectedFilter] = useState(null);

    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareData, setShareData] = useState({ text: '', url: '' });
    const [visibleStockCount, setVisibleStockCount] = useState(10);

    // DETAIL MODAL STATE
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailModalData, setDetailModalData] = useState({ title: '', data: null, type: '' });

    if (!performance) return null;

    const handleCardClick = (title, data, type) => {
        setDetailModalData({ title, data, type });
        setIsDetailModalOpen(true);
    };

    const openShareModal = (item, type) => {
        const baseUrl = getShareBaseUrl();
        const shareUrl = `${baseUrl}${window.location.pathname}${window.location.search}`;
        let shareText = '';
        let shareContext = {};

        if (type === 'ByStock') {
            shareText = t('performanceTabs.shareText.byStock', { rank: item.rank, ticker: item.ticker });
            shareContext = { context: 'stockRank', ticker: item.ticker };
        } else {
            shareText = t('performanceTabs.shareText.byType', { rank: item.rank, type: t(`predictionTypes.${item.type.toLowerCase()}`) });
            shareContext = { context: 'typeRank', rankType: item.type };
        }

        setShareData({ text: shareText, url: shareUrl, context: shareContext });
        setIsShareModalOpen(true);
    };

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setSelectedFilter(null);
        onFilterChange(performance);
        setVisibleStockCount(10);
    }

    const displayedStocks = performance.byStock.slice(0, visibleStockCount);
    const hasMoreStocks = performance.byStock.length > visibleStockCount;

    return (
        <>
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                text={shareData.text}
                url={shareData.url}
                shareContext={shareData.context}
            />

            <PerformanceDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={detailModalData.title}
                data={detailModalData.data}
                predictions={predictions}
                type={detailModalData.type}
            />

            <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
                <div className="flex border-b border-gray-700 mb-4">
                    <button onClick={() => { setActiveTab('ByType'); setSelectedFilter(null); onFilterChange(performance); }} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'ByType' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                        {t('performanceTabs.tabs.byType')}
                    </button>
                    <button onClick={() => { setActiveTab('ByStock'); setSelectedFilter(null); onFilterChange(performance); }} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'ByStock' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                        {t('performanceTabs.tabs.byStock')}
                    </button>
                </div>
                {activeTab === 'ByType' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-fast">
                        {performance.byType?.length > 0 ? performance.byType.map(p => (
                            <StatCard
                                key={p.type}
                                label={t(`predictionTypes.${p.type.toLowerCase()}`)}
                                avgRating={p.avgRating}
                                rank={p.rank}
                                isSelected={false}
                                onClick={() => handleCardClick(p.type, p, 'ByType')} // Can pass translated label as title? Or raw type? 'p.type' is key 'Weekly'.
                                onShareClick={() => openShareModal(p, 'ByType')}
                            />
                        )) : <p className="md:col-span-2 text-gray-500 text-center py-4">{t('performanceTabs.noData.byType')}</p>}
                    </div>
                )}
                {activeTab === 'ByStock' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-fast">
                        {displayedStocks.length > 0 ? displayedStocks.map(s => (
                            <StatCard
                                key={s.ticker}
                                label={s.ticker}
                                avgRating={s.avgRating}
                                isStock={true}
                                rank={s.rank}
                                isSelected={false}
                                onClick={() => handleCardClick(s.ticker, s, 'ByStock')}
                                onShareClick={() => openShareModal(s, 'ByStock')}
                            />
                        )) : <p className="md:col-span-2 text-gray-500 text-center py-4">{t('performanceTabs.noData.byStock')}</p>}

                        <div className="md:col-span-2">
                            <LoadMoreButton
                                onClick={() => setVisibleStockCount(prev => prev + 10)}
                                isLoading={false}
                                hasMore={hasMoreStocks}
                            />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default PerformanceTabs;