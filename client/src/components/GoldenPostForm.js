// src/components/GoldenPostForm.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import StockFilterSearch from './StockFilterSearch';

const GoldenPostForm = ({ isOpen, onClose, onPostCreated }) => {
    const [message, setMessage] = useState('');
    const [isAttachingPrediction, setIsAttachingPrediction] = useState(false);
    const [prediction, setPrediction] = useState({
        stockTicker: '',
        targetPrice: '',
        predictionType: 'Weekly'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // 1. Add state to hold the selected stock's quote data
    const [selectedStockQuote, setSelectedStockQuote] = useState(null);

    useEffect(() => {
        if (!isOpen) {
            setMessage('');
            setIsAttachingPrediction(false);
            setPrediction({ stockTicker: '', targetPrice: '', predictionType: 'Weekly' });
            setSelectedStockQuote(null); // Reset on close
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handlePredictionChange = (e) => {
        setPrediction({ ...prediction, [e.target.name]: e.target.value });
    };

    // 2. New handler to fetch the stock price when selected
    const handleStockSelect = (stockTicker) => {
        setPrediction(p => ({ ...p, stockTicker: stockTicker }));
        if (stockTicker) {
            axios.get(`${process.env.REACT_APP_API_URL}/api/quote/${stockTicker}`)
                .then(res => {
                    setSelectedStockQuote(res.data);
                    // Auto-fill the target price with the current price
                    setPrediction(p => ({ ...p, targetPrice: res.data.regularMarketPrice.toFixed(2) }));
                })
                .catch(() => toast.error(`Could not fetch price for ${stockTicker}.`));
        } else {
            setSelectedStockQuote(null);
            setPrediction(p => ({ ...p, targetPrice: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message) {
            return toast.error("Post message cannot be empty.");
        }

        setIsSubmitting(true);
        const postData = {
            message,
            attachedPrediction: isAttachingPrediction ? prediction : null
        };

        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/api/posts/golden`, postData, { withCredentials: true });
            toast.success("Golden Post published!");
            onPostCreated();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not create post.");
        } finally {
            setIsSubmitting(false);
        }
    };

     // 3. Calculate the percentage change for display
    let percentageChange = 0;
    if (selectedStockQuote && prediction.targetPrice) {
        const initialPrice = selectedStockQuote.regularMarketPrice;
        const targetPrice = parseFloat(prediction.targetPrice);
        if (initialPrice > 0) {
            percentageChange = ((targetPrice - initialPrice) / initialPrice) * 100;
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
            <div className="relative bg-gray-800 p-6 rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white mb-4">Create Golden Post</h2>
                <form onSubmit={handleSubmit}>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Share your exclusive analysis with your subscribers..."
                        className="w-full bg-gray-700 text-white p-2 rounded-md h-32"
                        maxLength="2000"
                    />
                    
                    <div className="flex items-center my-4">
                        <input type="checkbox" id="attachPrediction" checked={isAttachingPrediction} onChange={() => setIsAttachingPrediction(!isAttachingPrediction)} className="w-4 h-4 text-yellow-500 bg-gray-700 border-gray-600 rounded"/>
                        <label htmlFor="attachPrediction" className="ml-2 text-sm font-medium text-gray-300">Attach a Prediction</label>
                    </div>

                    {isAttachingPrediction && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-700 rounded-lg">
                            <div className="sm:col-span-1">
                                <label className="text-xs font-bold text-gray-400">Stock</label>
                                <StockFilterSearch onStockSelect={handleStockSelect} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold text-gray-400">Target Price</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" step="0.01" name="targetPrice" value={prediction.targetPrice} onChange={handlePredictionChange} className="w-full bg-gray-900 p-2 rounded-md" />
                                    {/* 4. Display the live percentage change */}
                                    {selectedStockQuote && (
                                        <span className={`font-bold text-sm flex-shrink-0 ${percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            ({percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%)
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="sm:col-span-3">
                                <label className="text-xs font-bold text-gray-400">Type</label>
                                <select name="predictionType" value={prediction.predictionType} onChange={handlePredictionChange} className="w-full bg-gray-900 p-2 rounded-md">
                                    <option>Hourly</option><option>Daily</option><option>Weekly</option>
                                    <option>Monthly</option><option>Quarterly</option><option>Yearly</option>
                                </select>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-700">
                        <button type="button" onClick={onClose} className="bg-gray-600 font-bold py-2 px-4 rounded-md">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="bg-yellow-500 text-black font-bold py-2 px-4 rounded-md disabled:bg-gray-500">{isSubmitting ? 'Posting...' : 'Post'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GoldenPostForm;