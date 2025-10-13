// src/components/PredictionHistoryModal.js
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Line } from 'react-chartjs-2';
import { formatDateTime, formatCurrency } from '../utils/formatters';

const PredictionHistoryModal = ({ isOpen, onClose, prediction }) => {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'chart'

    if (!isOpen || !prediction) return null;

    // 1. Create a complete timeline, including the initial prediction
    const fullHistory = [
        {
            isInitial: true,
            updatedAt: prediction.createdAt,
            newTargetPrice: prediction.targetPriceAtCreation,
            reason: prediction.initialDescription || t('predictionHistoryModal.initialReason'),
            priceAtTimeOfUpdate: prediction.priceAtCreation
        },
        ...prediction.history
    ].reverse(); // 2. Reverse the array to show newest updates first

    // 3. Chart data is built from the reversed (newest first) history
    const chartData = {
        labels: fullHistory.map(entry => formatDateTime(entry.updatedAt, i18n.language)).reverse(), // Reverse labels back for correct chart order
        datasets: [
            {
                label: t('predictionHistoryModal.chartLabelPredicted'),
                data: fullHistory.map(entry => entry.newTargetPrice).reverse(), // Reverse data back for correct chart order
                borderColor: '#22c55e',
                tension: 0.1,
                fill: false,
            },
            {
                label: t('predictionHistoryModal.chartLabelActual'),
                data: fullHistory.map(entry => entry.priceAtTimeOfUpdate).reverse(), // Reverse data back for correct chart order
                backgroundColor: '#3b82f6',
                borderColor: '#3b82f6',
                pointRadius: 5,
                pointHoverRadius: 7,
                showLine: false,
            }
        ]
    };

    const chartOptions = {
        maintainAspectRatio: false,
        scales: {
            y: { ticks: { color: '#9ca3af' } },
            x: { ticks: { color: '#9ca3af', display: false } } // 4. Remove dates from X-axis
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{t('predictionHistoryModal.title', { ticker: prediction.stockTicker })}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* 5. Tab Buttons */}
                <div className="flex border-b border-gray-700 mb-4">
                    <button onClick={() => setActiveTab('list')} className={`px-4 py-2 font-bold ${activeTab === 'list' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>{t('predictionHistoryModal.tabHistory')}</button>
                    <button onClick={() => setActiveTab('chart')} className={`px-4 py-2 font-bold ${activeTab === 'chart' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>{t('predictionHistoryModal.tabChart')}</button>
                </div>

                {/* 6. Vertically Scrollable Content Area */}
                <div className="flex-grow overflow-y-auto max-h-[60vh] pr-2 modern-scrollbar">
                    {activeTab === 'list' && (
                        <div className="space-y-4">
                            {fullHistory.map((entry, index) => (
                                <div key={index} className="bg-gray-700 p-4 rounded-lg">
                                    <div className="flex justify-between items-baseline">
                                        <p className={`font-bold text-lg ${entry.isInitial ? 'text-gray-400' : 'text-white'}`}>
                                            {formatCurrency(entry.newTargetPrice, i18n.language, prediction.currency)}
                                        </p>
                                        <p className="text-xs text-gray-500">{formatDateTime(entry.updatedAt, i18n.language)}</p>
                                    </div>
                                    {entry.reason && (
                                        <p className="text-sm text-gray-300 mt-1 italic">"{entry.reason}"</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'chart' && (
                        <div className="h-64">
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PredictionHistoryModal;