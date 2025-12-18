// src/components/PredictionList.js
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isSameDay, isSameWeek, isSameMonth, isSameQuarter, isSameYear } from 'date-fns';
import MiniPredictionCard from './MiniPredictionCard';
import LoadMoreButton from './LoadMoreButton';
import ShareModal from './ShareModal';
import { FaShareAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { getShareBaseUrl } from '../utils/urlHelper';

const PredictionList = ({ titleKey, predictions, quotes, isOwnProfile, onEditClick, emptyTextKey, profileUsername, id, isAdmin, onDeleteClick }) => {
    const { t } = useTranslation();
    const [visibleCount, setVisibleCount] = useState(6);
    // NEW STATE: For the Share Modal
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareData, setShareData] = useState({ text: '', url: '' });
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Helper for smart grouping
    const isSameBatch = (date1, date2, type) => {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        switch (type) {
            case 'Hourly': return d1.getTime() === d2.getTime(); // Hourly is strict
            case 'Daily': return isSameDay(d1, d2);
            case 'Weekly': return isSameWeek(d1, d2, { weekStartsOn: 1 }); // ISO Week (Monday start)
            case 'Monthly': return isSameMonth(d1, d2);
            case 'Quarterly': return isSameQuarter(d1, d2);
            case 'Yearly': return isSameYear(d1, d2);
            default: return false;
        }
    };

    // NEW FUNCTION: Aggregates data and opens the modal
    const handleShareClick = (timeframeType) => {
        let filteredPredictions = predictions.filter(p => p.predictionType === timeframeType);

        if (filteredPredictions.length === 0) {
            return toast.error(t('share.noPredictionsForTimeframe'));
        }

        let predictionsToShare = [];
        let stockListString = '';
        let allTickers = new Set();
        let hashtagString = '';
        let correctDirection = 0;
        let total = 0;
        let subject = isOwnProfile
            ? t('share.myUsername')
            : (profileUsername || filteredPredictions[0]?.userId?.username || 'User') + t('share.possessiveSuffix', "'s");
        let shareText = '';
        const ACTIVE_PREDICTIONS_ANCHOR = "#active";

        // Use helper to ensure prod domain on mobile
        let baseUrl = getShareBaseUrl() + window.location.pathname;
        let shareUrl = baseUrl;

        if (quotes) {
            // --- ACTIVE PREDICTIONS LOGIC (Existing) ---
            shareUrl += ACTIVE_PREDICTIONS_ANCHOR;

            predictionsToShare = filteredPredictions.map(p => {
                const currentPrice = quotes[p.stockTicker];
                allTickers.add(p.stockTicker);

                if (currentPrice) {
                    total++;
                    const predictedDirection = p.targetPrice - currentPrice;
                    // Check if direction from creation is correct
                    if (predictedDirection * (p.targetPrice - (p.priceAtCreation || 0)) > 0) {
                        correctDirection++;
                    }

                    const changePercent = ((p.targetPrice - currentPrice) / currentPrice) * 100;
                    const sign = changePercent > 0 ? '+' : (changePercent < 0 ? '-' : '');

                    // Format: $TSLA: $245 (+%4.1)
                    return `$${p.stockTicker}: $${p.targetPrice.toFixed(2)} (${sign}%${Math.abs(changePercent).toFixed(1)})`;
                }
                return null;
            }).filter(item => item !== null);

            stockListString = predictionsToShare.slice(0, 5).join('\n');
            const accuracy = total > 0 ? (correctDirection / total) * 100 : 0;
            const accuracyText = accuracy.toFixed(0);

            const allTickersArray = Array.from(allTickers);
            hashtagString = allTickersArray.slice(0, 3).map(t => `$${t}`).join(' ');

            shareText = t('share.activePredictionsAggregated', {
                subject: subject,
                type: t(`predictionTypes.${timeframeType.toLowerCase()}`),
                count: predictionsToShare.length,
                accuracy: accuracyText,
                predictionList: stockListString,
                hashtags: hashtagString
            });

        } else {
            // --- HISTORY PREDICTIONS LOGIC (New) ---
            shareUrl += "#history";

            // 1. Grouping: Find the *most recent batch* (Smart Grouping)
            // Sort by assessedAt descending to get latest first
            filteredPredictions.sort((a, b) => new Date(b.assessedAt) - new Date(a.assessedAt));

            if (filteredPredictions.length === 0) return toast.error(t('share.noPredictionsForTimeframe'));

            // Group by SMART logic (e.g., Same Week, Same Month) using DEADLINE
            const lastDeadline = filteredPredictions[0].deadline;
            const batch = filteredPredictions.filter(p => isSameBatch(p.deadline, lastDeadline, timeframeType));

            let totalRating = 0;
            predictionsToShare = batch.map(p => {
                allTickers.add(p.stockTicker);
                total++;
                // Check if targetHit is true for accuracy
                if (p.targetHit) correctDirection++;

                totalRating += p.rating || 0;

                // Format: $TICKER: Target $X | Actual $Y | Accuracy Z
                // Use .toFixed(2) for actual price
                return `$${p.stockTicker}: ${t('common.target')} $${p.targetPrice} | ${t('common.actual')} $${p.actualPrice?.toFixed(2)} | ${t('common.accuracy')} ${p.rating.toFixed(0)}`;
            });

            stockListString = predictionsToShare.slice(0, 5).join('\n');
            const accuracy = total > 0 ? (totalRating / total) : 0;

            const allTickersArray = Array.from(allTickers);
            hashtagString = allTickersArray.slice(0, 3).map(t => `$${t}`).join(' ');

            // Construct new text directly or use a new translation key
            // Header: "[Subject] Last [TIMEFRAME] Results 📊"
            const resultsText = isOwnProfile ? t('share.results') : t('share.results_other');
            const header = `${subject} ${t('share.last')} ${t(`predictionTypes.${timeframeType.toLowerCase()}`)} ${resultsText} 📊`;

            shareText = `${header}\n\n${stockListString}\n\n🎯 ${t('common.accuracy')}: ${accuracy.toFixed(0)}%\n\n${hashtagString} #StockPredictorAI`;
        }

        // 3. Open the Modal
        setShareData({
            text: shareText,
            url: shareUrl,
            shareContext: { context: quotes ? 'activePredictions' : 'historyPredictions', type: timeframeType }
        });
        setIsShareModalOpen(true);
    };

    return (
        <>
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                title={t('share.shareActivePredictions')}
                text={shareData.text}
                url={shareData.url}
                shareContext={shareData.shareContext}
            />
            <div id={id} className="bg-gray-800 p-6 rounded-lg scroll-mt-24">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">{t(titleKey)}</h3>

                    {/* NEW SHARE DROPDOWN (Click-Activated) */}
                    {predictions.length > 0 && (
                        // --- FIX 2: Replace 'group' with manual 'isMenuOpen' control ---
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen(prev => !prev);
                                }}
                                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
                            >
                                <FaShareAlt className="w-5 h-5" />
                            </button>

                            {/* --- FIX 3: Conditional Rendering controlled by state --- */}
                            {isMenuOpen && (
                                <div className="absolute end-0 top-full mt-2 bg-gray-800 rounded-md shadow-xl z-10 w-64">
                                    <p className="text-xs text-gray-500 p-2 border-b border-gray-700">{t('share.shareByTimeframe')}</p>
                                    {['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'].map(type => {
                                        // Logic to determine count to show
                                        let count = 0;
                                        const typePredictions = predictions.filter(p => p.predictionType === type);

                                        if (quotes) {
                                            // Active mode: show all
                                            count = typePredictions.length;
                                        } else {
                                            // History mode: show count of "latest batch" only (Smart Grouping)
                                            if (typePredictions.length > 0) {
                                                // Sort by assessedAt desc to get latest assessment FIRST
                                                typePredictions.sort((a, b) => new Date(b.assessedAt) - new Date(a.assessedAt));
                                                // Group by SMART logic
                                                const lastDeadline = typePredictions[0].deadline;
                                                const batch = typePredictions.filter(p => isSameBatch(p.deadline, lastDeadline, type));
                                                count = batch.length;
                                            }
                                        }

                                        return (
                                            <button
                                                key={type}
                                                onClick={() => {
                                                    handleShareClick(type);
                                                    setIsMenuOpen(false); // Close menu after action
                                                }}
                                                className="block w-full text-start px-4 py-2 text-sm text-gray-300 hover:bg-green-600 hover:text-white"
                                            >
                                                {t(`predictionTypes.${type.toLowerCase()}`)} ({count})
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {/* --- END FIX 3 --- */}
                        </div>
                    )}
                </div>

                {predictions.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                        {predictions.slice(0, visibleCount).map(p => (
                            <MiniPredictionCard
                                key={p._id}
                                prediction={p}
                                currentPrice={quotes ? quotes[p.stockTicker] : undefined}
                                isOwnProfile={isOwnProfile}
                                onEditClick={onEditClick}
                                isAdmin={isAdmin}
                                onDeleteClick={onDeleteClick}
                            />
                        ))}
                    </div>
                ) : <p className="text-gray-500 text-center py-4">{t(emptyTextKey)}</p>}
                <LoadMoreButton
                    onClick={() => setVisibleCount(prev => prev + 6)}
                    hasMore={predictions.length > visibleCount}
                />
            </div>
        </>
    );
}

export default PredictionList;