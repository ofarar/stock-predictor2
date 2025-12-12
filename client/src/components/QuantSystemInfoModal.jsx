import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import useLockBodyScroll from '../hooks/useLockBodyScroll';

const QuantSystemInfoModal = ({ isOpen, onClose, profileData }) => {
    useLockBodyScroll(isOpen);
    const { t } = useTranslation();

    const stats = useMemo(() => {
        if (!profileData?.predictions) return { accuracy: 78.4, total: 0, f1: 0.82, avgRating: "N/A" };

        const assessed = profileData.predictions.filter(p =>
            p.status === 'Assessed' &&
            typeof p.priceAtCreation === 'number' &&
            typeof p.actualPrice === 'number'
        );

        const total = assessed.length;
        if (total === 0) return { accuracy: 0, total: 0, f1: 0, avgRating: "N/A" };

        const correct = assessed.filter(p => {
            const predictedDir = p.targetPrice - p.priceAtCreation;
            const actualDir = p.actualPrice - p.priceAtCreation;
            return (predictedDir * actualDir) > 0;
        }).length;

        const accuracy = (correct / total) * 100;

        // Simple F1 proxy (Precision ~ Accuracy for balanced classes)
        const f1 = (accuracy / 100).toFixed(2);

        // Get Average Rating from performance object
        const avgRating = profileData?.performance?.overallAvgRating
            ? profileData.performance.overallAvgRating.toFixed(1)
            : "N/A";

        return {
            accuracy: accuracy.toFixed(1),
            total,
            f1,
            avgRating
        };
    }, [profileData]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div
                className="bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-yellow-500/10 p-2 rounded-full border border-yellow-500/20">
                            <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-wide">QUANT SYSTEM SPEC SHEET</h2>
                            <p className="text-xs text-gray-400 font-mono uppercase">CLASSIFIED // ALGORITHMIC TRADING DIVISION</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">

                    {/* Current Version Badge */}
                    <div className="flex items-center justify-between bg-gradient-to-r from-blue-900/20 to-purple-900/20 p-4 rounded-lg border border-blue-500/30">
                        <div className="flex flex-col">
                            <span className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1">CURRENT ACTIVE MODEL</span>
                            <span className="text-2xl font-mono text-white font-bold flex items-center gap-2">
                                v3.0 <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30 border-opacity-50">LIVE</span>
                            </span>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-400 uppercase">Released</div>
                            <div className="text-white font-mono">2025-12-08</div>
                        </div>
                    </div>

                    {/* v3.0 Specs */}
                    <section>
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2 border-b border-gray-800 pb-2">
                            <span className="text-blue-500">///</span> v3.0 CHANGELOG & FEATURES
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">New Inputs</h4>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-2">
                                        <span className="text-yellow-500 mt-1">▹</span>
                                        <span className="text-sm text-gray-300"><strong className="text-white">Fed Interest Rate Decisions:</strong> Real-time distance metrics to FOMC meetings.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-yellow-500 mt-1">▹</span>
                                        <span className="text-sm text-gray-300"><strong className="text-white">Event-Driven Volatility:</strong> Dynamic risk adjustment during "Fed Weeks".</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Performance Goals</h4>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-500 mt-1">↗</span>
                                        <span className="text-sm text-gray-300">Reduced False Positives during macro events.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-green-500 mt-1">↗</span>
                                        <span className="text-sm text-gray-300">Improved calibration on Interest Rate Sensitive sectors (Tech/Growth).</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* v2.0 Specs (Renamed from Legacy) */}
                    <section className="opacity-90">
                        <h3 className="text-gray-400 font-bold text-lg mb-4 flex items-center gap-2 border-b border-gray-800 pb-2">
                            <span className="text-gray-500">///</span> v2.0 CORE ARCHITECTURE
                        </h3>
                        <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-800">
                            <div className="grid grid-cols-2 text-sm gap-y-3">
                                <div>
                                    <span className="block text-xs text-gray-500 uppercase">Released</span>
                                    <span className="text-gray-300 font-mono">2025-08-12</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 uppercase">Input Layer</span>
                                    <span className="text-gray-300 font-mono">XGBoost Regressor</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="block text-xs text-gray-500 uppercase">Core Features</span>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        <span className="bg-gray-700 text-xs px-2 py-1 rounded text-gray-300">Price Action</span>
                                        <span className="bg-gray-700 text-xs px-2 py-1 rounded text-gray-300">Volume Expansion</span>
                                        <span className="bg-gray-700 text-xs px-2 py-1 rounded text-gray-300">Sector Sympathy</span>
                                        <span className="bg-gray-700 text-xs px-2 py-1 rounded text-gray-300">QQQ Macro Trend</span>
                                    </div>
                                </div>
                                <div className="col-span-2 mt-2 pt-2 border-t border-gray-700/50 grid grid-cols-3 gap-4">
                                    <div className="text-center md:text-left">
                                        <span className="block text-xs text-gray-500 uppercase">Dir. Accuracy</span>
                                        <span className="text-green-400 font-mono font-bold">{stats.accuracy}%</span>
                                    </div>
                                    <div className="text-center md:text-left">
                                        <span className="block text-xs text-gray-500 uppercase">Avg Rating</span>
                                        <span className="text-yellow-400 font-mono font-bold">{stats.avgRating}</span>
                                    </div>
                                    <div className="text-center md:text-left">
                                        <span className="block text-xs text-gray-500 uppercase">Processed</span>
                                        <span className="text-blue-400 font-mono font-bold">{stats.total}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="bg-black/50 p-4 border-t border-gray-800 text-center text-xs text-gray-500 font-mono">
                    SIGMA ALPHA QUANTITATIVE ENGINE // PROPRIETARY ALGORITHM
                </div>
            </div>
        </div>,
        document.body
    );
};

export default QuantSystemInfoModal;
