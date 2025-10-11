import React from 'react';

const predictionTypes = [
    { name: 'Hourly', description: 'Predict the stock price for the end of the current or next trading hour. Ideal for short-term volatility.' },
    { name: 'Daily', description: 'Predict the stock price for the end of the current or next trading day. A classic timeframe for day-to-day market moves.' },
    { name: 'Weekly', description: 'Predict the stock price for the end of the current trading week (Friday). Good for tracking weekly trends.' },
    { name: 'Monthly', description: 'Predict the stock price for the end of the current calendar month. Best for capturing monthly momentum.' },
    { name: 'Quarterly', description: 'Predict the stock price for the end of the current financial quarter (e.g., March, June, September, December).' },
    { name: 'Yearly', description: 'Predict the stock price for the end of the current calendar year. A long-term prediction for major market shifts.' },
];

const PredictionTypesModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white mb-6">Prediction Types Explained</h2>
                <div className="space-y-4">
                    {predictionTypes.map(pt => (
                        <div key={pt.name} className="bg-gray-700 p-3 rounded-md">
                            <h3 className="font-bold text-green-400">{pt.name}</h3>
                            <p className="text-sm text-gray-300">{pt.description}</p>
                        </div>
                    ))}
                </div>
                 <div className="flex justify-end mt-6">
                    <button onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PredictionTypesModal;