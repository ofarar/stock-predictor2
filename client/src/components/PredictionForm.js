import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast'; // 1. Import toast

const PredictionForm = ({ selectedStock }) => {
    const [target, setTarget] = useState('');
    const [predictionType, setPredictionType] = useState('Daily');
    const [status, setStatus] = useState({ isOpen: false, message: 'Select a prediction type.' });

    const currentPrice = selectedStock ? selectedStock.regularMarketPrice : 0;

    useEffect(() => {
        const calculateWindow = () => {
            const now = new Date();
            let deadline, windowCloses, message;
            let isOpen = true; // Assume open for longer-term predictions

            switch (predictionType) {
                case 'Hourly':
                    windowCloses = new Date(now).setMinutes(5, 0, 0);
                    deadline = new Date(now).setHours(now.getHours() + 1, 0, 0, 0);
                    if (now.getTime() < windowCloses) {
                        const diff = windowCloses - now.getTime();
                        const minutes = Math.floor((diff / 1000 / 60) % 60);
                        const seconds = Math.floor((diff / 1000) % 60);
                        message = `Window closes in: ${minutes}m ${seconds}s`;
                    } else {
                        isOpen = false;
                        const nextOpen = new Date(now).setHours(now.getHours() + 1, 0, 0, 0);
                        const diff = nextOpen - now.getTime();
                        const minutes = Math.floor((diff / 1000 / 60) % 60);
                        message = `Next window opens in: ${minutes}m`;
                    }
                    break;
                case 'Weekly':
                    deadline = new Date(now);
                    deadline.setDate(deadline.getDate() + (5 - deadline.getDay())); // Upcoming Friday
                    deadline.setHours(22, 0, 0, 0);
                    message = `Prediction for this Friday, ${deadline.toLocaleDateString()}`;
                    break;
                case 'Quarterly':
                    deadline = new Date(now);
                    deadline.setMonth(deadline.getMonth() + 3); // 3 months from now
                    message = `Prediction for 3 months, ${deadline.toLocaleDateString()}`;
                    break;
                case 'Yearly':
                    deadline = new Date(now);
                    deadline.setFullYear(deadline.getFullYear() + 1); // 1 year from now
                    message = `Prediction for 1 year, ${deadline.toLocaleDateString()}`;
                    break;
                case 'Daily':
                default:
                    windowCloses = new Date(now).setHours(10, 0, 0, 0);
                    deadline = new Date(now).setHours(22, 0, 0, 0);
                    if (now.getTime() < windowCloses) {
                        message = `Prediction for End of Day, Closes at 10:00 AM`;
                    } else {
                        isOpen = false;
                        message = `Daily window closed. Try tomorrow.`;
                    }
                    break;
            }
            setStatus({ isOpen, message, deadline: new Date(deadline) });
        };
        
        const timer = setInterval(calculateWindow, 1000);
        return () => clearInterval(timer);
    }, [predictionType]);

    useEffect(() => {
        if (selectedStock) setTarget(currentPrice.toFixed(2));
    }, [selectedStock, currentPrice]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!status.isOpen || !selectedStock) return;
        const predictionData = {
            stockTicker: selectedStock.symbol,
            targetPrice: parseFloat(target),
            deadline: status.deadline,
            predictionType,
        };
        axios.post(`${process.env.REACT_APP_API_URL}/api/predict`, predictionData, { withCredentials: true })
            .then(res => toast.success('Prediction submitted successfully!'))
            .catch(err => console.error("Prediction submission error:", err));
    };

    if (!selectedStock) {
        return (
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md h-full flex items-center justify-center min-h-[380px]">
                <p className="text-gray-400 text-center">Search for an asset to begin.</p>
            </div>
        );
    }
    
    return (
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md min-h-[380px]">
            <h2 className="text-3xl font-bold text-white mb-2 text-center">Predict {selectedStock.symbol}</h2>
            <p className="text-center text-gray-400 mb-1">Current Price: <span className="font-semibold text-white ml-2">${currentPrice.toFixed(2)}</span></p>
            <p className="text-center text-xs text-gray-500 mb-4">Data delayed up to 15 minutes</p>

            <div className="flex flex-wrap justify-center gap-2 mb-4">
                <button onClick={() => setPredictionType('Hourly')} className={`px-3 py-1 text-xs font-bold rounded-md ${predictionType === 'Hourly' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}>Hourly</button>
                <button onClick={() => setPredictionType('Daily')} className={`px-3 py-1 text-xs font-bold rounded-md ${predictionType === 'Daily' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}>Daily</button>
                <button onClick={() => setPredictionType('Weekly')} className={`px-3 py-1 text-xs font-bold rounded-md ${predictionType === 'Weekly' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}>Weekly</button>
                <button onClick={() => setPredictionType('Quarterly')} className={`px-3 py-1 text-xs font-bold rounded-md ${predictionType === 'Quarterly' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}>Quarterly</button>
                <button onClick={() => setPredictionType('Yearly')} className={`px-3 py-1 text-xs font-bold rounded-md ${predictionType === 'Yearly' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}>Yearly</button>
            </div>
            
            <div className={`text-center p-3 rounded-md mb-4 ${status.isOpen ? 'bg-green-900 bg-opacity-50' : 'bg-red-900 bg-opacity-50'}`}>
                <p className="font-semibold text-white text-sm">{status.message}</p>
            </div>

            <form onSubmit={handleSubmit}>
                <label htmlFor="targetPrice" className="block text-sm font-medium text-gray-300">Target Price ($)</label>
                <input id="targetPrice" type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)}
                    disabled={!status.isOpen}
                    className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:opacity-50" />
                <button type="submit" disabled={!status.isOpen} className="w-full mt-4 bg-green-500 text-white font-bold py-3 px-4 rounded-md hover:bg-green-600 transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed">
                    Place Prediction
                </button>
            </form>
        </div>
    );
};

export default PredictionForm;