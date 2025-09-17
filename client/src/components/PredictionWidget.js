import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast'; // 1. Import toast

// Helper function to check market hours (approximates US market)
// A robust implementation would use a library like 'market-hours' to handle holidays
const isMarketOpen = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const day = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const isWeekday = day >= 1 && day <= 5;
    // Market open: 9:30 AM ET -> 13:30 UTC
    // Market close: 4:00 PM ET -> 20:00 UTC
    const isMarketHours = utcHour > 13 || (utcHour === 13 && now.getUTCMinutes() >= 30);
    const isBeforeClose = utcHour < 20;
    return isWeekday && isMarketHours && isBeforeClose;
};

const PredictionWidget = ({ onClose, initialStock }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStock, setSelectedStock] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [target, setTarget] = useState('');
    const [predictionType, setPredictionType] = useState('Daily');
    const [status, setStatus] = useState({ isOpen: false, message: 'Search for an asset to begin.', deadline: null });

    const currentPrice = selectedStock ? selectedStock.regularMarketPrice : 0;

    // Effect to pre-fill the form if an initial stock is passed from another page
    useEffect(() => {
        if (initialStock && initialStock.regularMarketPrice) {
            setSelectedStock(initialStock);
            setTarget(initialStock.regularMarketPrice.toFixed(2));
        }
    }, [initialStock]);

    // Effect for handling search functionality
    useEffect(() => {
        if (!searchTerm) {
            setSearchResults([]);
            return;
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

    // Effect for handling prediction window logic and timers
    useEffect(() => {
        if (!selectedStock) return;

        const timer = setInterval(() => {
            if (!isMarketOpen() && (predictionType === 'Hourly' || predictionType === 'Daily')) {
                setStatus({ isOpen: false, message: 'Market is currently closed.' });
                return;
            }

            const now = new Date();
            let deadline, windowCloses, message;
            let isOpen = true;

            switch (predictionType) {
                case 'Hourly':
                    windowCloses = new Date(now);
                    windowCloses.setMinutes(5, 0, 0);
                    deadline = new Date(now);
                    deadline.setHours(now.getHours() + 1, 0, 0, 0);

                    if (now.getTime() < windowCloses.getTime()) {
                        const diff = windowCloses.getTime() - now.getTime();
                        const minutes = Math.floor((diff / 1000 / 60) % 60);
                        const seconds = Math.floor((diff / 1000) % 60);
                        message = `Window closes in: ${minutes}m ${seconds}s`;
                    } else {
                        isOpen = false;
                        const nextOpen = new Date(now);
                        nextOpen.setHours(now.getHours() + 1, 0, 0, 0);
                        const diff = nextOpen.getTime() - now.getTime();
                        const minutes = Math.floor((diff / 1000 / 60) % 60);
                        message = `Next hourly window opens in: ${minutes}m`;
                    }
                    break;
                case 'Weekly':
                    deadline = new Date(now);
                    const dayOfWeek = deadline.getDay(); // Sunday = 0, Friday = 5
                    const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 6;
                    deadline.setDate(deadline.getDate() + daysUntilFriday);
                    deadline.setHours(22, 0, 0, 0);
                    message = `Prediction for this Friday, ${deadline.toLocaleDateString()}`;
                    break;
                case 'Quarterly':
                    deadline = new Date(now);
                    deadline.setMonth(deadline.getMonth() + 3);
                    message = `Prediction for 3 months, ending ${deadline.toLocaleDateString()}`;
                    break;
                case 'Yearly':
                    deadline = new Date(now);
                    deadline.setFullYear(deadline.getFullYear() + 1);
                    message = `Prediction for 1 year, ending ${deadline.toLocaleDateString()}`;
                    break;
                case 'Daily':
                default:
                    windowCloses = new Date(now).setHours(10, 0, 0, 0);
                    deadline = new Date(now).setHours(22, 0, 0, 0);
                    if (now.getTime() < windowCloses) {
                        message = `Daily prediction window closes at 10:00 AM`;
                    } else {
                        isOpen = false;
                        message = 'Daily window is closed for today.';
                    }
                    break;
            }
            setStatus({ isOpen, message, deadline: new Date(deadline) });
        }, 1000);

        return () => clearInterval(timer);
    }, [predictionType, selectedStock]);

    const handleSelectStock = (symbol) => {
        setIsLoading(true);
        setError('');
        setSearchTerm('');
        setSearchResults([]);
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
        if (!status.isOpen || !selectedStock) return;
        
        const predictionData = {
            stockTicker: selectedStock.symbol,
            targetPrice: parseFloat(target),
            deadline: status.deadline,
            predictionType,
        };

        axios.post(`${process.env.REACT_APP_API_URL}/api/predict`, predictionData, { withCredentials: true })
            .then(res => {
                toast.success(`Prediction for ${selectedStock.symbol} submitted successfully!`);
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
                    <input 
                        type="text"
                        placeholder="Search for a stock (e.g., AAPL)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"
                    />
                    {searchResults.length > 0 && (
                        <ul className="absolute z-10 w-full bg-gray-700 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                            {searchResults.map(result => (
                                <li key={result.symbol} onClick={() => handleSelectStock(result.symbol)}
                                    className="px-4 py-2 text-white hover:bg-green-500 cursor-pointer">
                                    {result.symbol} - {result.shortname}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {isLoading && <p className="text-gray-400 text-center py-2">Loading...</p>}
            {error && <p className="text-red-400 text-center py-2">{error}</p>}

            {selectedStock ? (
                <div className="animate-fade-in">
                    <p className="text-center text-gray-400 mb-1">
                        Predicting for <span className="font-bold text-white">{selectedStock.symbol}</span> | 
                        Current Price: <span className="font-semibold text-white ml-2">${currentPrice ? currentPrice.toFixed(2) : 'N/A'}</span>
                    </p>
                    <p className="text-center text-xs text-gray-500 mb-4">Data delayed up to 15 minutes</p>

                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                        <button type="button" onClick={() => setPredictionType('Hourly')} className={`px-3 py-1 text-xs font-bold rounded ${predictionType === 'Hourly' ? 'bg-green-500' : 'bg-gray-700'}`}>Hourly</button>
                        <button type="button" onClick={() => setPredictionType('Daily')} className={`px-3 py-1 text-xs font-bold rounded ${predictionType === 'Daily' ? 'bg-green-500' : 'bg-gray-700'}`}>Daily</button>
                        <button type="button" onClick={() => setPredictionType('Weekly')} className={`px-3 py-1 text-xs font-bold rounded ${predictionType === 'Weekly' ? 'bg-green-500' : 'bg-gray-700'}`}>Weekly</button>
                        <button type="button" onClick={() => setPredictionType('Quarterly')} className={`px-3 py-1 text-xs font-bold rounded ${predictionType === 'Quarterly' ? 'bg-green-500' : 'bg-gray-700'}`}>Quarterly</button>
                        <button type="button" onClick={() => setPredictionType('Yearly')} className={`px-3 py-1 text-xs font-bold rounded ${predictionType === 'Yearly' ? 'bg-green-500' : 'bg-gray-700'}`}>Yearly</button>
                    </div>

                    <div className={`text-center p-3 rounded-md mb-4 ${status.isOpen ? 'bg-green-900 bg-opacity-50' : 'bg-red-900 bg-opacity-50'}`}>
                        <p className="font-semibold text-white text-sm">{status.message}</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm text-gray-300">Target Price for {selectedStock.symbol}</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                value={target} 
                                onChange={(e) => setTarget(e.target.value)}
                                disabled={!status.isOpen}
                                className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white disabled:opacity-50" 
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={!status.isOpen}
                            className="w-full mt-4 bg-green-500 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed"
                        >
                            Place Prediction
                        </button>
                    </form>
                </div>
            ) : (
                !initialStock && <p className="text-center text-gray-500 py-8">Search for a stock to begin.</p>
            )}
        </div>
    );
};

export default PredictionWidget;