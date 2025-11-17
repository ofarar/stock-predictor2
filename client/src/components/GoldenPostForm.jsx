// src/components/GoldenPostForm.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import StockFilterSearch from './StockFilterSearch';
import { useTranslation } from 'react-i18next';
import { formatPercentage } from '../utils/formatters'; // Import formatter

const GoldenPostForm = ({ isOpen, onClose, onPostCreated }) => {
    const { t, i18n } = useTranslation(); // Add i18n
    const [message, setMessage] = useState('');
    const [isAttachingPrediction, setIsAttachingPrediction] = useState(false);
    const [prediction, setPrediction] = useState({
        stockTicker: '',
        targetPrice: '',
        predictionType: 'Weekly'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedStockQuote, setSelectedStockQuote] = useState(null);

    useEffect(() => {
        if (!isOpen) {
            setMessage('');
            setIsAttachingPrediction(false);
            setPrediction({ stockTicker: '', targetPrice: '', predictionType: 'Weekly' });
            setSelectedStockQuote(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handlePredictionChange = (e) => {
        setPrediction({ ...prediction, [e.target.name]: e.target.value });
    };

    const handleStockSelect = (stockTicker) => {
        setPrediction(p => ({ ...p, stockTicker }));
        if (stockTicker) {
            axios.get(`${import.meta.env.VITE_API_URL}/api/quote/${stockTicker}`)
                .then(res => {
                    // Check if the response is valid and has a price
                    if (res.data && res.data.regularMarketPrice != null) {
                        setSelectedStockQuote(res.data);
                        // Only pre-fill target if price exists
                        setPrediction(p => ({ ...p, targetPrice: res.data.regularMarketPrice.toFixed(2) }));
                    } else {
                        // API failed or no price, store minimal data
                        setSelectedStockQuote({ symbol: stockTicker, regularMarketPrice: null });
                        setPrediction(p => ({ ...p, targetPrice: '' })); // Clear target price
                    }
                })
                .catch(() => {
                    toast.error(t('goldenPostForm.fetchPriceError', { ticker: stockTicker }));
                    setSelectedStockQuote(null);
                    setPrediction(p => ({ ...p, targetPrice: '' }));
                });
        } else {
            setSelectedStockQuote(null);
            setPrediction(p => ({ ...p, targetPrice: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message) return toast.error(t('goldenPostForm.emptyMessageError'));

        setIsSubmitting(true);
        const postData = {
            message,
            attachedPrediction: isAttachingPrediction ? prediction : null
        };

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/posts/golden`, postData, { withCredentials: true });
            toast.success(t('goldenPostForm.createSuccess'));
            onPostCreated();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || t('goldenPostForm.createFail'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Resilient Percentage Calculation
    let percentageChange = null;
    const currentPrice = selectedStockQuote?.regularMarketPrice;
    if (typeof currentPrice === 'number' && currentPrice > 0 && prediction.targetPrice) {
        const targetPrice = parseFloat(prediction.targetPrice);
        if (!isNaN(targetPrice)) {
            percentageChange = ((targetPrice - currentPrice) / currentPrice) * 100;
        }
    }

    const predictionTypes = ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
            <div className="relative bg-gray-800 p-6 rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white mb-4">{t('goldenPostForm.title')}</h2>
                <form onSubmit={handleSubmit}>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t('goldenPostForm.messagePlaceholder')}
                        className="w-full bg-gray-700 text-white p-2 rounded-md h-32"
                        maxLength="2000"
                    />

                    <div className="flex items-center my-4">
                        <input type="checkbox" id="attachPrediction" checked={isAttachingPrediction} onChange={() => setIsAttachingPrediction(!isAttachingPrediction)} className="w-4 h-4 text-yellow-500 bg-gray-700 border-gray-600 rounded" />
                        <label htmlFor="attachPrediction" className="ml-2 text-sm font-medium text-gray-300">{t('goldenPostForm.attachPredictionLabel')}</label>
                    </div>

                    {isAttachingPrediction && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-700 rounded-lg">
                            <div className="sm:col-span-1">
                                <label className="text-xs font-bold text-gray-400">{t('goldenPostForm.stockLabel')}</label>
                                <StockFilterSearch onStockSelect={handleStockSelect} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold text-gray-400">{t('goldenPostForm.targetPriceLabel')}</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" step="0.01" name="targetPrice" value={prediction.targetPrice} onChange={handlePredictionChange} className="w-full bg-gray-900 p-2 rounded-md" />
                                    {/* Conditionally render percentage or placeholder */}
                                    {selectedStockQuote && (
                                        typeof percentageChange === 'number' ? (
                                            <span className={`font-bold text-sm flex-shrink-0 ${percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                ({formatPercentage(percentageChange, i18n.language)})
                                            </span>
                                        ) : (
                                            <span className="font-bold text-sm text-gray-500">...</span>
                                        )
                                    )}
                                </div>
                            </div>
                            <div className="sm:col-span-3">
                                <label className="text-xs font-bold text-gray-400">{t('goldenPostForm.typeLabel')}</label>
                                <select
                                    name="predictionType"
                                    value={prediction.predictionType} // This should match the English key
                                    onChange={handlePredictionChange}
                                    className="w-full bg-gray-900 p-2 rounded-md"
                                >
                                    {/* Map over the English keys */}
                                    {predictionTypes.map(type => (
                                        <option key={type} value={type}>
                                            {/* Display the translated text */}
                                            {t(`predictionTypes.${type.toLowerCase()}`)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-700">
                        <button type="button" onClick={onClose} className="bg-gray-600 font-bold py-2 px-4 rounded-md">{t('goldenPostForm.cancelButton')}</button>
                        <button type="submit" disabled={isSubmitting} className="bg-yellow-500 text-black font-bold py-2 px-4 rounded-md disabled:bg-gray-500">
                            {isSubmitting ? t('goldenPostForm.postingButton') : t('goldenPostForm.postButton')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GoldenPostForm;
