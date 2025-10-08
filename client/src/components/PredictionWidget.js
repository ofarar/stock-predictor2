// src/components/PredictionWidget.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import TimePenaltyBar from './TimePenaltyBar';

const isMarketOpen = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const day = now.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;
    const isAfterOpen = utcHour > 13 || (utcHour === 13 && now.getUTCMinutes() >= 30);
    const isBeforeClose = utcHour < 20;
    return isWeekday && isAfterOpen && isBeforeClose;
};

const getPredictionDetails = (predictionType) => {
    const now = new Date();
    let deadline = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let message = '';
    let barWidth = 100;
    let maxScore = 100;
    let isOpen = true;

    switch (predictionType) {
        case 'Hourly': {
            if (!isMarketOpen()) return { isOpen: false, message: 'Market is currently closed', barWidth: '0%' };
            const elapsedMinutes = now.getMinutes();
            const penalty = elapsedMinutes > 10 ? Math.floor(((elapsedMinutes - 10) / 50) * 20) : 0;
            maxScore = 100 - penalty;
            barWidth = 100 - (elapsedMinutes / 60 * 100);
            deadline.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
            break;
        }
        case 'Daily': {
            const marketCloseToday = new Date(now.getTime());
            marketCloseToday.setUTCHours(20, 0, 0, 0);
            const day = now.getUTCDay();
            const isAfterHours = now.getTime() > marketCloseToday.getTime();
            if (day === 6) { deadline.setUTCDate(now.getUTCDate() + 2); } 
            else if (day === 0) { deadline.setUTCDate(now.getUTCDate() + 1); } 
            else if (day === 5 && isAfterHours) { deadline.setUTCDate(now.getUTCDate() + 3); } 
            else if (isAfterHours) { deadline.setUTCDate(now.getUTCDate() + 1); }
            deadline.setUTCHours(20, 0, 0, 0);
            if (deadline.getUTCDate() !== now.getUTCDate() || deadline.getUTCMonth() !== now.getUTCMonth()) {
                maxScore = 100; barWidth = 100;
                message = `Prediction for ${deadline.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;
            } else {
                const marketOpen = new Date().setUTCHours(13, 30, 0, 0);
                const elapsedMinutes = Math.max(0, (now.getTime() - marketOpen) / 60000);
                const totalMinutes = 390;
                const penalty = Math.floor(elapsedMinutes / (totalMinutes / 20));
                maxScore = 100 - penalty; barWidth = 100 - (elapsedMinutes / totalMinutes * 100);
                message = `Max Score: ${maxScore}`;
            }
            return { isOpen: true, message, deadline, barWidth: `${Math.max(0, barWidth)}%` };
        }
        case 'Weekly': {
            const dayOfWeek = now.getUTCDay();
            const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 6;
            deadline.setUTCDate(now.getUTCDate() + daysUntilFriday);
            const penalty = (dayOfWeek > 0 && dayOfWeek < 6) ? (dayOfWeek - 1) * 4 : 20;
            maxScore = 100 - penalty; barWidth = 100 - ((dayOfWeek - 1) / 4 * 100);
            break;
        }
        case 'Monthly': {
            deadline = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
            deadline.setUTCHours(20, 0, 0, 0);
            const totalDaysInMonth = deadline.getUTCDate();
            const elapsedDays = now.getUTCDate();
            const penalty = Math.floor((elapsedDays / totalDaysInMonth) * 25);
            maxScore = 100 - penalty; barWidth = 100 - (elapsedDays / totalDaysInMonth * 100);
            break;
        }
        // ++ ADDED: Quarterly case ++
        case 'Quarterly': {
            deadline.setUTCMonth(now.getUTCMonth() + 3); // Deadline is 3 months from now
            // Simple penalty: 25 points lost over ~90 days
            const startOfQuarter = new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1));
            const elapsedDays = (now - startOfQuarter) / (1000 * 60 * 60 * 24);
            const penalty = Math.floor((elapsedDays / 90) * 25);
            maxScore = 100 - penalty;
            barWidth = 100 - (elapsedDays / 90 * 100);
            break;
        }
        case 'Yearly': {
            deadline.setUTCFullYear(now.getUTCFullYear(), 11, 31);
            const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
            const elapsedDays = (now - startOfYear) / (1000 * 60 * 60 * 24);
            const penalty = Math.floor((elapsedDays / 365) * 30);
            maxScore = 100 - penalty; barWidth = 100 - (elapsedDays / 365 * 100);
            break;
        }
        default:
            isOpen = false; message = 'Select a valid prediction type.';
            break;
    }
    message = message || `Max Score: ${maxScore}`;
    return { isOpen, message, deadline, barWidth: `${Math.max(0, barWidth)}%` };
};

const PredictionWidget = ({ onClose, initialStock, onInfoClick }) => {
    // ... all component logic remains the same
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStock, setSelectedStock] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [target, setTarget] = useState('');
    const [predictionType, setPredictionType] = useState('Weekly');
    const [formState, setFormState] = useState({
        isOpen: true, message: 'Max Score: 100', deadline: null, barWidth: '100%'
    });
    const currentPrice = selectedStock ? selectedStock.regularMarketPrice : 0;
    useEffect(() => {
        if (initialStock?.regularMarketPrice) {
            setSelectedStock(initialStock);
            setTarget(initialStock.regularMarketPrice.toFixed(2));
        }
    }, [initialStock]);
    useEffect(() => {
        if (!searchTerm) {
            setSearchResults([]); return;
        }
        setIsLoading(true);
        const delayDebounceFn = setTimeout(() => {
            axios.get(`${process.env.REACT_APP_API_URL}/api/search/${searchTerm}`)
                .then(res => setSearchResults(res.data.quotes || []))
                .catch(() => setError('Search failed.'))
                .finally(() => setIsLoading(false));
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);
    useEffect(() => {
        if (!selectedStock) return;
        const details = getPredictionDetails(predictionType);
        setFormState(details);
        if ((predictionType === 'Hourly' || predictionType === 'Daily') && isMarketOpen()) {
            const timer = setInterval(() => {
                const updatedDetails = getPredictionDetails(predictionType);
                setFormState(updatedDetails);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [predictionType, selectedStock]);
    const handleSelectStock = (symbol) => {
        setIsLoading(true); setError(''); setSearchTerm(''); setSearchResults([]);
        axios.get(`${process.env.REACT_APP_API_URL}/api/quote/${symbol}`)
            .then(res => {
                setSelectedStock(res.data);
                if (res.data.regularMarketPrice) {
                    setTarget(res.data.regularMarketPrice.toFixed(2));
                }
            })
            .catch(err => setError('Could not fetch quote.'))
            .finally(() => setIsLoading(false));
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!target || parseFloat(target) <= 0) {
            toast.error("Please enter a valid target price."); return;
        }
        if (!formState.isOpen || !selectedStock) {
            toast.error("Prediction window is closed or no stock is selected."); return;
        };
        const predictionData = {
            stockTicker: selectedStock.symbol,
            targetPrice: parseFloat(target),
            deadline: formState.deadline,
            predictionType,
        };
        axios.post(`${process.env.REACT_APP_API_URL}/api/predict`, predictionData, { withCredentials: true })
            .then(res => {
                toast.success(`Prediction for ${selectedStock.symbol} submitted!`);
                onClose();
            })
            .catch(err => {
                toast.error('Failed to submit prediction. You may need to log in.');
                onClose();
            });
    };

    return (
        <div className="w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Make a Prediction</h2>
            {!initialStock && (
                <div className="relative mb-4">
                    <input type="text" placeholder="Search for a stock (e.g., AAPL)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                    {searchResults.length > 0 && (
                        <ul className="absolute z-10 w-full bg-gray-700 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                            {searchResults.map((result, index) => (
                                <li key={`${result.symbol}-${index}`} onClick={() => handleSelectStock(result.symbol)} className="px-4 py-2 text-white hover:bg-green-500 cursor-pointer">
                                    {result.symbol} - {result.shortname}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
            {selectedStock ? (
                <div className="animate-fade-in">
                    <p className="text-center text-gray-400 mb-1">
                        Predicting for <span className="font-bold text-white">{selectedStock.symbol}</span> | Current Price: <span className="font-semibold text-white ml-2">${currentPrice ? currentPrice.toFixed(2) : 'N/A'}</span>
                    </p>
                    <p className="text-center text-xs text-gray-500 mb-4">Data delayed up to 15 minutes</p>
                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                        <button type="button" onClick={() => setPredictionType('Hourly')} className={`px-3 py-1 text-xs font-bold rounded ${predictionType === 'Hourly' ? 'bg-green-500' : 'bg-gray-700'}`}>Hourly</button>
                        <button type="button" onClick={() => setPredictionType('Daily')} className={`px-3 py-1 text-xs font-bold rounded ${predictionType === 'Daily' ? 'bg-green-500' : 'bg-gray-700'}`}>Daily</button>
                        <button type="button" onClick={() => setPredictionType('Weekly')} className={`px-3 py-1 text-xs font-bold rounded ${predictionType === 'Weekly' ? 'bg-green-500' : 'bg-gray-700'}`}>Weekly</button>
                        <button type="button" onClick={() => setPredictionType('Monthly')} className={`px-3 py-1 text-xs font-bold rounded ${predictionType === 'Monthly' ? 'bg-green-500' : 'bg-gray-700'}`}>Monthly</button>
                        {/* ++ ADDED: Quarterly button ++ */}
                        <button type="button" onClick={() => setPredictionType('Quarterly')} className={`px-3 py-1 text-xs font-bold rounded ${predictionType === 'Quarterly' ? 'bg-green-500' : 'bg-gray-700'}`}>Quarterly</button>
                        <button type="button" onClick={() => setPredictionType('Yearly')} className={`px-3 py-1 text-xs font-bold rounded ${predictionType === 'Yearly' ? 'bg-green-500' : 'bg-gray-700'}`}>Yearly</button>
                    </div>
                    <TimePenaltyBar message={formState.message} barWidth={formState.barWidth} onInfoClick={onInfoClick} />
                    <form onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm text-gray-300">Target Price for {selectedStock.symbol}</label>
                            <input type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} disabled={!formState.isOpen} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white disabled:opacity-50" />
                        </div>
                        <button type="submit" disabled={!formState.isOpen} className="w-full mt-4 bg-green-500 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed">
                            Place Prediction
                        </button>
                    </form>
                </div>
            ) : (!initialStock && <p className="text-center text-gray-500 py-8">Search for a stock to begin.</p>)}
        </div>
    );
};

export default PredictionWidget;