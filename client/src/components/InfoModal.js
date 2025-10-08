// src/components/InfoModal.js

import React from 'react';

const InfoModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        // FIX: Ensured the z-index is z-50, which is higher than the PredictionModal's z-40.
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
            <div className="relative bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg text-gray-300">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-4">Time Bonus Explained</h2>
                <div className="space-y-4 text-sm">
                    <p>To reward early analysis, a time-based penalty is applied to predictions. The maximum score you can achieve from a prediction decreases as the deadline approaches.</p>
                    <div>
                        <h3 className="font-bold text-white">Hourly Predictions:</h3>
                        <p>The penalty is applied minute-by-minute. The first 10 minutes have no penalty (Max Score: 100). The penalty increases linearly until the last 10 minutes of the hour, where the Max Score is 80.</p>
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Daily Predictions:</h3>
                        <p>The penalty is applied throughout the trading day. Predictions made right at market open have the highest potential score.</p>
                    </div>
                     <div>
                        <h3 className="font-bold text-white">Longer-Term Predictions:</h3>
                        <p>For Weekly, Monthly, and longer predictions, the penalty is proportional to the percentage of the prediction period that has already passed.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InfoModal;