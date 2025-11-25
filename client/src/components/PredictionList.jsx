// src/components/PredictionList.js
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MiniPredictionCard from './MiniPredictionCard';
import LoadMoreButton from './LoadMoreButton';
import ShareModal from './ShareModal';
import { FaShareAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';

const PredictionList = ({ titleKey, predictions, quotes, isOwnProfile, onEditClick, emptyTextKey, profileUsername, id }) => {
    const { t } = useTranslation();
    const [visibleCount, setVisibleCount] = useState(6);
    // NEW STATE: For the Share Modal
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareData, setShareData] = useState({ text: '', url: '' });

    // NEW FUNCTION: Aggregates data and opens the modal
    const handleShareClick = (timeframeType) => {
        const filteredPredictions = predictions.filter(p => p.predictionType === timeframeType);
        if (filteredPredictions.length === 0) {
            return toast.error(t('share.noPredictionsForTimeframe'));
        }

        // 1. Calculate Aggregated Accuracy/Direction (Unchanged - needed for {{accuracy}})
        let correctDirection = 0;
        let total = 0;
        let stockListString = ''; // Initialize the string for the list
        let allTickers = new Set(); // For hashtags
        let hashtagString = '';

        const predictionsToShare = filteredPredictions.map(p => {
            const currentPrice = quotes ? quotes[p.stockTicker] : null;
            allTickers.add(p.stockTicker);

            if (currentPrice) {
                total++;
                const predictedDirection = p.targetPrice - currentPrice;
                // Check if direction from creation is correct (unchanged logic)
                if (predictedDirection * (p.targetPrice - (p.priceAtCreation || 0)) > 0) {
                    correctDirection++;
                }

                const changePercent = ((p.targetPrice - currentPrice) / currentPrice) * 100;
                const sign = changePercent > 0 ? '+' : (changePercent < 0 ? '-' : '');

                // Create the attractive format: $TSLA: 245 (+%4.1) or $NVDA: 170 (-%4.2)
                return `#${p.stockTicker}: $${p.targetPrice.toFixed(2)} (${sign}%${Math.abs(changePercent).toFixed(1)})`;
            }
            return null; // Ignore if currentPrice is missing
        }).filter(item => item !== null);

        // Join the stock predictions into a readable string
        stockListString = predictionsToShare.slice(0, 5).join('\n'); // Limit to 5 for space

        const accuracy = total > 0 ? (correctDirection / total) * 100 : 0;
        const accuracyText = accuracy.toFixed(0);
        const predictionCount = predictionsToShare.length;
        const subject = isOwnProfile
            ? t('share.myUsername') // Owner path: "My" (correct)
            : (profileUsername || filteredPredictions[0]?.userId?.username || 'User') + t('share.possessiveSuffix', "'s");

        // Construct the hashtags string (Calculation MUST happen before line 68)
        const allTickersArray = Array.from(allTickers);
        hashtagString = allTickersArray.slice(0, 3).map(t => `#${t}`).join(' ');
        // ^ This calculation must be executed before it's used in the shareText object.

        // 2. Construct the Message (Updated)
        const shareText = t('share.activePredictionsAggregated', {
            subject: subject,
            type: t(`predictionTypes.${timeframeType.toLowerCase()}`),
            count: predictionCount,
            accuracy: accuracyText,
            predictionList: stockListString,
            hashtags: hashtagString // Already contains #BABA #ADBE #HIMS
        });
        // Define the unique anchor ID
        const ACTIVE_PREDICTIONS_ANCHOR = "#active";
        const baseUrl = window.location.origin + window.location.pathname;

        // Construct the URL by combining the current page URL with the anchor ID
        const shareUrl = baseUrl + ACTIVE_PREDICTIONS_ANCHOR;

        // 3. Open the Modal
        setShareData({
            text: shareText,
            url: shareUrl,
            shareContext: { context: 'activePredictions', type: timeframeType }
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
            <div id={id} className="bg-gray-800 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">{t(titleKey)}</h3>

                    {/* NEW SHARE DROPDOWN */}
                    {predictions.length > 0 && quotes && (
                        <div className="relative group">
                            <button className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700">
                                <FaShareAlt className="w-5 h-5" />
                            </button>
                            <div className="absolute end-0 top-full mt-2 hidden group-hover:block bg-gray-800 rounded-md shadow-xl z-10 w-48">
                                <p className="text-xs text-gray-500 p-2 border-b border-gray-700">{t('share.shareByTimeframe')}</p>
                                {['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => handleShareClick(type)}
                                        className="block w-full text-start px-4 py-2 text-sm text-gray-300 hover:bg-green-600 hover:text-white"
                                    >
                                        {t(`predictionTypes.${type.toLowerCase()}`)} ({predictions.filter(p => p.predictionType === type).length})
                                    </button>
                                ))}
                            </div>
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