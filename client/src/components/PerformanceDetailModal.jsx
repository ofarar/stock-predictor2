import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import AggressivenessProgressBar from './AggressivenessProgressBar';
import DirectionAccuracyBar from './DirectionAccuracyBar';
import { formatNumber, formatSharePercentage } from '../utils/formatters';
import useLockBodyScroll from '../hooks/useLockBodyScroll';

const PerformanceDetailModal = ({ isOpen, onClose, title, data, predictions, type }) => {
    useLockBodyScroll(isOpen);
    const { t, i18n } = useTranslation();

    // 1. Filter predictions for this specific item (Stock or Type)
    const filteredPredictions = useMemo(() => {
        if (!predictions || predictions.length === 0) return [];
        return predictions.filter(p => {
            if (type === 'ByStock') {
                return p.stockTicker === title;
            } else {
                return p.predictionType === title;
            }
        });
    }, [predictions, title, type]);

    // 2. Calculate Direction Accuracy
    const directionStats = useMemo(() => {
        const assessed = filteredPredictions.filter(p => p.status === 'Assessed' && typeof p.priceAtCreation === 'number' && typeof p.actualPrice === 'number');
        const total = assessed.length;
        if (total === 0) return { accuracy: 0, correct: 0, total: 0 };
        const correct = assessed.filter(p => {
            const predictedDir = p.targetPrice - p.priceAtCreation;
            const actualDir = p.actualPrice - p.priceAtCreation;
            return (predictedDir * actualDir) > 0;
        }).length;
        return { accuracy: (correct / total) * 100, correct, total };
    }, [filteredPredictions]);

    // 3. Calculate Aggressiveness Distribution
    const aggressivenessDistribution = useMemo(() => {
        const dist = { defensive: 0, neutral: 0, offensive: 0 };
        let analyzedCount = 0;

        const thresholds = {
            Hourly: { def: 1, neu: 3 },
            Daily: { def: 3, neu: 7 },
            Weekly: { def: 5, neu: 10 },
            Monthly: { def: 8, neu: 20 },
            Quarterly: { def: 10, neu: 25 },
            Yearly: { def: 15, neu: 35 }
        };

        filteredPredictions.forEach(p => {
            if (p.priceAtCreation > 0 && (p.status === 'Assessed' || p.status === 'Active')) {
                analyzedCount++;
                const absoluteChange = Math.abs((p.targetPrice - p.priceAtCreation) / p.priceAtCreation) * 100;
                const typeThresholds = thresholds[p.predictionType] || { def: 5, neu: 15 };

                if (absoluteChange <= typeThresholds.def) {
                    dist.defensive++;
                } else if (absoluteChange <= typeThresholds.neu) {
                    dist.neutral++;
                } else {
                    dist.offensive++;
                }
            }
        });

        return { distribution: dist, analyzedCount };
    }, [filteredPredictions]);


    if (!isOpen) return null;

    const avgRating = data?.avgRating || 0;
    const rank = data?.rank || '-';

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
            role="button"
            tabIndex="-1"
        >
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto modern-scrollbar" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{title}</h2>
                        <p className="text-gray-400 text-sm">{t('performance_detail_modal.subtitle', 'Performance Details')}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                            <span className="text-gray-300 text-sm font-medium">{t('performanceTabs.statCard.averageRating')}</span>
                            <span className="text-white font-bold text-lg">{avgRating.toFixed(1)}</span>
                        </div>
                        <div className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                            <span className="text-gray-300 text-sm font-medium">{t('performanceTabs.statCard.rank')}</span>
                            <span className="text-white font-bold text-lg">
                                {rank <= 3 && <span className="mr-1">⭐</span>}
                                #{rank}
                            </span>
                        </div>
                    </div>

                    <hr className="border-gray-700" />

                    {/* Prediction Style (Aggressiveness) */}
                    <div>
                        <AggressivenessProgressBar
                            data={aggressivenessDistribution.distribution}
                            analyzedCount={aggressivenessDistribution.analyzedCount}
                            className="bg-gray-700 p-4 rounded-lg text-center w-full"
                            alwaysVisible={true}
                        />
                    </div>

                    {/* Direction Accuracy */}
                    <div>
                        <DirectionAccuracyBar
                            accuracy={directionStats.accuracy}
                            correctCount={directionStats.correct}
                            totalCount={directionStats.total}
                            className="bg-gray-700 p-4 rounded-lg text-center w-full"
                            alwaysVisible={true}
                        />
                    </div>
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700">
                        {t('common.close', 'Close')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

PerformanceDetailModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    data: PropTypes.object,
    predictions: PropTypes.array,
    type: PropTypes.oneOf(['ByStock', 'ByType']),
};

export default PerformanceDetailModal;
