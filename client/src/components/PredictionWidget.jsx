// src/components/PredictionWidget.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import TimePenaltyBar from './TimePenaltyBar';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { getPredictionDetails } from '../utils/timeHelpers';
import Tooltip from '../components/Tooltip';
import { THRESHOLDS, NUMERIC_CONSTANTS } from '../constants';

const PredictionWidget = ({ onClose, initialStock, onInfoClick, onTypesInfoClick, requestConfirmation }) => {
    const { t, i18n } = useTranslation();

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    // State to hold the final quote object
    const [selectedStock, setSelectedStock] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [target, setTarget] = useState('');
    const [description, setDescription] = useState('');
    const [predictionType, setPredictionType] = useState('Weekly');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formState, setFormState] = useState({
        isOpen: true, message: 'Max Rating: 100', deadline: null, barWidth: '100%'
    });
    const predictionTypes = ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

    // --- NEW: Function to fetch quote and set state ---
    const fetchAndSetStock = async (symbol) => {
        setIsLoading(true);
        setError('');
        setSearchResults([]); // Crucial to clear results before fetch

        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/quote/${symbol}`);
            if (res.data && res.data.price != null && typeof res.data.price === 'number') {
                setSelectedStock(res.data);
                setTarget(res.data.price.toFixed(2));
            } else {
                // Price is missing/invalid, set partial data
                setSelectedStock({
                    symbol: symbol,
                    price: null,
                    longName: res.data?.longName,
                    currency: res.data?.currency || 'USD',
                    marketState: res.data?.marketState || 'CLOSED'
                });
                setTarget('');
            }
            // CRITICAL FIX: Do NOT set searchTerm here, rely solely on selectedStock.

        } catch (err) {
            setError(t('prediction.quoteFetchError', 'Could not fetch quote.'));
            setSelectedStock(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-select initial stock and fetch price if needed
    useEffect(() => {
        if (initialStock && initialStock.symbol) {
            if (initialStock.price != null && typeof initialStock.price === 'number') {
                // Case 1: Full quote exists (e.g., from StockPage)
                setSelectedStock(initialStock);
                setTarget(initialStock.price.toFixed(2));
                // CRITICAL FIX: Set searchTerm only if we AREN'T rendering the stock form yet
                // For a smooth transition, we must clear the search term if we have a stock.
                setSearchTerm('');
            } else {
                // Case 2: Only symbol exists (e.g., from EarningsBanner) - needs fetch
                fetchAndSetStock(initialStock.symbol);
                // Temporarily set a mock stock to bypass the search view immediately
                setSelectedStock({ symbol: initialStock.symbol, price: null, isFetching: true });
            }
        } else {
            // Case 3: No stock provided (initial state)
            setSelectedStock(null);
            setTarget('');
            setSearchTerm('');
        }
    }, [initialStock, t]);


    // Handle search input
    useEffect(() => {
        // Only run search if a stock is NOT currently selected.
        if (selectedStock || !searchTerm) {
            setSearchResults([]);
            return;
        }

        // setIsLoading(true); // Moved inside timeout to prevent immediate UI lock
        setError('');
        const delayDebounceFn = setTimeout(() => {
            setIsLoading(true);
            axios.get(`${import.meta.env.VITE_API_URL}/api/search/${searchTerm}`)
                .then(res => setSearchResults(res.data.quotes || []))
                .catch(() => setError(t('prediction.searchFailed', 'Search failed.')))
                .finally(() => setIsLoading(false));
        }, NUMERIC_CONSTANTS.SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, selectedStock, t]); // Now depends on selectedStock

    // Update time penalty bar (unchanged)
    useEffect(() => {
        if (!selectedStock) return;
        const details = getPredictionDetails(predictionType, t, i18n, selectedStock);
        setFormState(details);

        if (predictionType === 'Hourly' || predictionType === 'Daily') {
            const timer = setInterval(() => {
                const updatedDetails = getPredictionDetails(predictionType, t, i18n, selectedStock);
                setFormState(updatedDetails);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [predictionType, selectedStock, t, i18n]);


    const handleSelectStock = (symbol) => {
        setSearchResults([]);
        setSearchTerm(symbol);
        fetchAndSetStock(symbol);
    };

    // Resilient handleSubmit
    const handleSubmit = (e) => {
        e.preventDefault();
        // Basic validation first
        if (!target || parseFloat(target) <= 0 || !selectedStock) {
            return toast.error(t('prediction.invalidTarget', "Please enter a valid target price."));
        }
        if (!formState.isOpen) {
            return toast.error(t('prediction.windowClosed', "Prediction window is closed."));
        }

        const currentPrice = selectedStock?.price; // <-- Use v3 field
        let percentChange = null;

        // Only calculate percentage if current price is a valid number
        if (typeof currentPrice === 'number' && currentPrice > 0) {
            const targetValue = parseFloat(target);
            if (!isNaN(targetValue)) {
                percentChange = Math.abs(((targetValue - currentPrice) / currentPrice) * 100);
                const thresholds = {
                    Hourly: THRESHOLDS.CONFIRMATION_HOURLY,
                    Daily: THRESHOLDS.CONFIRMATION_DAILY,
                    Weekly: THRESHOLDS.CONFIRMATION_WEEKLY,
                    Monthly: THRESHOLDS.CONFIRMATION_MONTHLY,
                    Quarterly: THRESHOLDS.CONFIRMATION_QUARTERLY,
                    Yearly: THRESHOLDS.CONFIRMATION_YEARLY,
                };
                const limit = thresholds[predictionType];

                // Trigger confirmation only if percentage was calculable and exceeds limit
                if (requestConfirmation && percentChange > limit) {
                    const formattedPrice = formatCurrency(targetValue, i18n.language, selectedStock.currency);
                    const formattedPercent = formatPercentage(percentChange, i18n.language);
                    const message = t('prediction.confirmationMessage', {
                        price: formattedPrice,
                        percent: formattedPercent,
                        limit: limit
                    });
                    // Important: Use return to stop execution here; confirmation will call executePrediction
                    return requestConfirmation(message, executePrediction);
                }
            }
        }

        // If price is null or percentage doesn't exceed limit, execute directly
        executePrediction();
    };

    const executePrediction = () => {
        setIsSubmitting(true);
        const predictionData = {
            stockTicker: selectedStock.symbol,
            targetPrice: parseFloat(target),
            deadline: formState.deadline,
            predictionType,
            description,
            maxRatingAtCreation: formState.maxScore
        };
        axios.post(`${import.meta.env.VITE_API_URL}/api/predict`, predictionData, { withCredentials: true })
            .then(() => {
                toast.success(t('prediction.submitSuccess', { symbol: selectedStock.symbol }));
                onClose();
            })
            .catch((err) => {
                // --- FIX: Handle the new 'errorKey' from the server ---
                if (err.response && err.response.data?.errorKey === 'prediction.duplicateError') {
                    toast.error(t(err.response.data.errorKey, err.response.data.metadata));
                } else if (err.response && err.response.data?.code === 'PREDICTION_LIMIT_REACHED') {
                    toast.error(t('prediction.limitReached', { limit: err.response.data.limit }));
                } else {
                    toast.error(err.response?.data?.message || t('prediction.submitFailed'));
                }
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    // Resilient percentage calculation for display only (unchanged)
    let displayPercentageChange = null;
    const currentPriceForDisplay = selectedStock?.price;
    if (typeof currentPriceForDisplay === 'number' && currentPriceForDisplay > 0 && target) {
        const targetValue = parseFloat(target);
        if (!isNaN(targetValue)) {
            displayPercentageChange = ((targetValue - currentPriceForDisplay) / currentPriceForDisplay) * 100;
        }
    }


    // --- RENDER LOGIC: THE FINAL FIX ---

    // New check for loading state during fetch from banner/search
    const isFetchingStock = selectedStock?.isFetching || isLoading;

    if (!selectedStock || isFetchingStock) {
        // Show initial search view or a loading placeholder
        return (
            <div className="w-full">
                <h2 className="text-2xl font-bold text-white mb-6">{t('prediction.makePrediction')}</h2>
                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder={t('prediction.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"
                    // Disable input while a fetch is running
                    // disabled={isFetchingStock} 
                    />
                    {isFetchingStock && <p className="text-center text-gray-400 py-4">{t('prediction.searching')}</p>}
                    {error && <p className="text-center text-red-400 py-4">{error}</p>}
                    {searchResults.length > 0 && (
                        <ul className="absolute z-10 w-full bg-gray-700 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                            {searchResults.map((result, index) => (
                                <li key={`${result.symbol}-${index}`} onClick={() => handleSelectStock(result.symbol)} className="px-4 py-2 text-white hover:bg-green-500 cursor-pointer">
                                    {result.symbol} - {result.shortname || result.longname}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        );
    }

    // Main prediction form (only shown when selectedStock is definitively set)
    return (
        <div className="w-full">
            <h2 className="text-2xl font-bold text-white mb-6">{t('prediction.makePrediction')}</h2>
            <div className="animate-fade-in">
                {/* --- Stock Display and Quick Change --- */}
                <div className="text-center mb-4">
                    <p className="text-xl font-bold text-white">{selectedStock.symbol}</p>
                    <div className="text-gray-400 flex items-center justify-center">
                        {t('prediction.currentPrice')}:&nbsp;
                        <span className="font-semibold text-white">
                            <Tooltip text={t('prediction.priceDelayInfo')}>
                                {formatCurrency(selectedStock.price, i18n.language, selectedStock.currency)}
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
                            <div className="flex items-center gap-2 bg-gray-900 rounded-md pe-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={target}
                                    onChange={(e) => setTarget(e.target.value)}
                                    disabled={!formState.isOpen}
                                    className="w-full bg-transparent p-2 text-white disabled:opacity-50 focus:outline-none"
                                    placeholder={selectedStock.price === null ? t('prediction.enterTargetManually', 'Enter Target') : ''}
                                />
                                {typeof displayPercentageChange === 'number' ? (
                                    <span className={`font-bold text-sm flex-shrink-0 ${displayPercentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {formatPercentage(displayPercentageChange, i18n.language)}
                                    </span>
                                ) : (
                                    selectedStock && <span className="font-bold text-sm text-gray-500">...</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-300">{t('prediction.rationale')}</label>
                        <textarea placeholder={t('prediction.rationalePlaceholder')} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={NUMERIC_CONSTANTS.RATIONALE_CHAR_LIMIT} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white text-sm" rows="2" />
                    </div>
                    <button type="submit" disabled={!formState.isOpen || isSubmitting} className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {isSubmitting ? t('prediction.submitting') : t('prediction.placePrediction')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PredictionWidget;