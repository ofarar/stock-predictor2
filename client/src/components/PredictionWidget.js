import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import TimePenaltyBar from './TimePenaltyBar';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { getPredictionDetails, isMarketOpen, isPreMarketWindow } from '../utils/timeHelpers';
import Tooltip from '../components/Tooltip';

const PredictionWidget = ({ onClose, initialStock, onInfoClick, onTypesInfoClick, requestConfirmation }) => {
    const { t, i18n } = useTranslation();

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStock, setSelectedStock] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(''); // For search errors
    const [target, setTarget] = useState('');
    const [description, setDescription] = useState('');
    const [predictionType, setPredictionType] = useState('Weekly');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formState, setFormState] = useState({
        isOpen: true, message: 'Max Score: 100', deadline: null, barWidth: '100%'
    });
    const predictionTypes = ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

    // This useEffect hook handles searching for stocks as the user types.
    useEffect(() => {
        if (!searchTerm) { setSearchResults([]); return; }
        setIsLoading(true);
        const delayDebounceFn = setTimeout(() => {
            axios.get(`${process.env.REACT_APP_API_URL}/api/search/${searchTerm}`)
                .then(res => setSearchResults(res.data.quotes || []))
                .catch(() => setError('Search failed.'))
                .finally(() => setIsLoading(false));
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // This useEffect hook updates the time penalty bar.
    useEffect(() => {
        if (!selectedStock) return;
        const details = getPredictionDetails(predictionType, t, i18n);
        setFormState(details);
        if ((predictionType === 'Hourly' || predictionType === 'Daily') && (isMarketOpen() || isPreMarketWindow())) {
            const timer = setInterval(() => {
                const updatedDetails = getPredictionDetails(predictionType, t, i18n);
                setFormState(updatedDetails);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [predictionType, selectedStock, t, i18n]);

    const handleSelectStock = (symbol) => {
        setIsLoading(true);
        setError('');
        setSearchTerm('');
        setSearchResults([]);
        axios.get(`${process.env.REACT_APP_API_URL}/api/quote/${symbol}`)
            .then(res => {
                // The backend now sends null on failure
                if (res.data && res.data.regularMarketPrice) {
                    setSelectedStock(res.data);
                    setTarget(res.data.regularMarketPrice.toFixed(2));
                } else {
                    // This is the new "graceful failure" state
                    setSelectedStock({ symbol: symbol, regularMarketPrice: null });
                    setTarget('');
                }
            })
            .catch(() => {
                // This will now only catch critical server/network errors
                setError('Could not fetch quote.');
                setSelectedStock(null);
            })
            .finally(() => setIsLoading(false));
    };

    const resetToSearch = () => {
        setSelectedStock(null);
        setError('');
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!target || parseFloat(target) <= 0 || !selectedStock) return toast.error("Please enter a valid target price.");
        if (!formState.isOpen) return toast.error("Prediction window is closed.");
    
        const thresholds = { Hourly: 3, Daily: 10, Weekly: 15, Monthly: 20, Quarterly: 40, Yearly: 100 };
        const percentChange = Math.abs(((parseFloat(target) - selectedStock.regularMarketPrice) / selectedStock.regularMarketPrice) * 100);
        const limit = thresholds[predictionType];
    
        if (requestConfirmation && percentChange > limit) {
            const formattedPrice = formatCurrency(parseFloat(target), i18n.language, selectedStock.currency);
            const formattedPercent = formatPercentage(percentChange, i18n.language);
            const message = t('prediction.confirmationMessage', {
                price: formattedPrice,
                percent: formattedPercent,
                limit: limit
            });
            requestConfirmation(message, executePrediction);
        } else {
            executePrediction();
        }
    };
    
    const executePrediction = () => {
        setIsSubmitting(true);
        const predictionData = {
            stockTicker: selectedStock.symbol,
            targetPrice: parseFloat(target),
            deadline: formState.deadline,
            predictionType,
            description,
        };
        axios.post(`${process.env.REACT_APP_API_URL}/api/predict`, predictionData, { withCredentials: true })
            .then(() => {
                toast.success(t('prediction.submitSuccess', { symbol: selectedStock.symbol }));
                onClose();
            })
            .catch((err) => {
                if (err.response && err.response.data?.code === 'PREDICTION_LIMIT_REACHED') {
                    toast.error(t('prediction.limitReached', { limit: err.response.data.limit }));
                } else {
                    toast.error(t('prediction.submitFailed'));
                }
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };
    
    const currentPrice = selectedStock ? selectedStock.regularMarketPrice : 0;
    let percentageChange = 0;
    if (currentPrice > 0 && target) {
        percentageChange = ((parseFloat(target) - currentPrice) / currentPrice) * 100;
    }

    const renderContent = () => {
        if (!selectedStock) {
            // Initial search view
            return (
                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder={t('prediction.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"
                    />
                    {isLoading && <p className="text-center text-gray-400 py-4">{t('prediction.searching')}</p>}
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
            );
        }

        // NEW: View for when stock is selected but price is unavailable
        if (selectedStock && selectedStock.regularMarketPrice === null) {
            return (
                <div className="text-center animate-fade-in p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-xl font-bold text-white">{selectedStock.symbol}</h3>
                    <p className="text-yellow-400 my-4">{t('prediction.priceUnavailable.title')}</p>
                    <p className="text-sm text-gray-400 mb-6">{t('prediction.priceUnavailable.description')}</p>
                    <button onClick={resetToSearch} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-500">
                        {t('prediction.priceUnavailable.button')}
                    </button>
                </div>
            );
        }

        // Main prediction form view (if everything is successful)
        return (
            <div className="animate-fade-in">
                <div className="text-center mb-4">
                    <p className="text-xl font-bold text-white">{selectedStock.symbol}</p>
                    <div className="text-gray-400 flex items-center justify-center">
                        {t('prediction.currentPrice')}:&nbsp;
                        <span className="font-semibold text-white">
                            <Tooltip text={t('prediction.priceDelayInfo', 'Prices are delayed up to 15 minutes.')}>
                                {selectedStock?.regularMarketPrice != null
                                    ? formatCurrency(selectedStock.regularMarketPrice, i18n.language, selectedStock.currency)
                                    : t('prediction.na')}
                            </Tooltip>
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <TimePenaltyBar message={formState.message} barWidth={formState.barWidth} onInfoClick={onInfoClick} />

                    <div className="grid grid-cols-5 gap-3 bg-gray-700 p-4 rounded-lg">
                        <div className="col-span-5 sm:col-span-2">
                            <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-2">
                                {t('prediction.type')}
                                <button
                                    type="button"
                                    onClick={onTypesInfoClick}
                                    className="w-4 h-4 flex items-center justify-center bg-gray-600 text-gray-300 rounded-full text-xs font-bold hover:bg-gray-500"
                                    aria-label={t('prediction.learnMore')}
                                >
                                    ?
                                </button>
                            </label>
                            <select
                                value={predictionType}
                                onChange={(e) => setPredictionType(e.target.value)}
                                className="w-full bg-gray-900 text-white p-2 rounded-md"
                            >
                                {predictionTypes.map(type => (
                                    <option key={type} value={type}>
                                        {t(`predictionTypes.${type.toLowerCase()}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-5 sm:col-span-3">
                            <label className="block text-xs font-bold text-gray-400 mb-1">{t('prediction.targetPrice')}</label>
                            <div className="flex items-center gap-2 bg-gray-900 rounded-md pr-2">
                                <input type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} disabled={!formState.isOpen} className="w-full bg-transparent p-2 text-white disabled:opacity-50 focus:outline-none" />
                                <span className={`font-bold text-sm flex-shrink-0 ${percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatPercentage(percentageChange, i18n.language)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-300">{t('prediction.rationale')}</label>
                        <textarea placeholder={t('prediction.rationalePlaceholder')} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white text-sm" rows="2" />
                    </div>
                    <button type="submit" disabled={!formState.isOpen || isSubmitting} className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {isSubmitting ? t('prediction.submitting', 'Submitting...') : t('prediction.placePrediction')}
                    </button>
                </form>
            </div>
        );
    };

    return (
        <div className="w-full">
            <h2 className="text-2xl font-bold text-white mb-6">{t('prediction.makePrediction')}</h2>
            {renderContent()}
        </div>
    );
};

export default PredictionWidget;