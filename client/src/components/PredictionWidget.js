// src/components/PredictionWidget.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import TimePenaltyBar from './TimePenaltyBar';
import { useTranslation } from 'react-i18next';
import { formatPercentage, formatCurrency, formatDate } from '../utils/formatters';

const isMarketOpen = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const day = now.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;
    const isAfterOpen = utcHour > 13 || (utcHour === 13 && now.getUTCMinutes() >= 30);
    const isBeforeClose = utcHour < 20;
    return isWeekday && isAfterOpen && isBeforeClose;
};

const isPreMarketWindow = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const day = now.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;
    const isInWindow = utcHour === 13 && now.getUTCMinutes() < 30;
    return isWeekday && isInWindow;
};

const getPredictionDetails = (predictionType, t, i18n) => {
    const now = new Date();
    let deadline = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let message = '';
    let barWidth = 100;
    let maxScore = 100;
    let isOpen = true;

    switch (predictionType) {
        case 'Hourly': {
            if (isPreMarketWindow()) {
                deadline.setUTCHours(14, 0, 0, 0);
                // CORRECTED: Use the "Opening Hour" message
                message = t('predictionWidgetMessages.openingHourPrediction');
                isOpen = true;
            } else if (isMarketOpen()) {
                const elapsedMinutes = now.getMinutes();
                const penalty = elapsedMinutes > 10 ? Math.floor(((elapsedMinutes - 10) / 50) * 20) : 0;
                maxScore = 100 - penalty;
                barWidth = 100 - (elapsedMinutes / 60 * 100);
                deadline.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
                isOpen = true;
            } else {
                isOpen = false;
                // FIXED: Use translation key
                message = t('predictionWidgetMessages.marketClosed');
                barWidth = 0;
            }
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
                // FIXED: Use formatDate utility
                message = t('predictionWidgetMessages.forDate', { date: formatDate(deadline, i18n.language) });
            } else {
                const marketOpen = new Date().setUTCHours(13, 30, 0, 0);
                const elapsedMinutes = Math.max(0, (now.getTime() - marketOpen) / 60000);
                const totalMinutes = 390;
                const penalty = Math.floor(elapsedMinutes / (totalMinutes / 20));
                maxScore = 100 - penalty;
                barWidth = 100 - (elapsedMinutes / totalMinutes * 100);
                // FIXED: Use translation key
                message = t('predictionWidgetMessages.maxScore', { score: maxScore });
            }
            // REMOVED premature return, using break for consistency
            break;
        }
        case 'Weekly': {
            let weeklyDeadline = new Date(now.getTime());
            const dayOfWeek = now.getUTCDay();
            const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 6;
            weeklyDeadline.setUTCDate(now.getUTCDate() + daysUntilFriday);
            weeklyDeadline.setUTCHours(20, 0, 0, 0);
            if (now.getTime() > weeklyDeadline.getTime()) {
                weeklyDeadline.setUTCDate(weeklyDeadline.getUTCDate() + 7);
            }
            deadline = weeklyDeadline;
            const startOfWeek = new Date(deadline.getTime());
            startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 4);
            startOfWeek.setUTCHours(13, 30, 0, 0);
            const elapsedMillis = Math.max(0, now.getTime() - startOfWeek.getTime());
            const totalMillis = deadline.getTime() - startOfWeek.getTime();
            const percentElapsed = (elapsedMillis / totalMillis) * 100;
            const penalty = Math.floor(percentElapsed / (100 / 20));
            maxScore = 100 - penalty;
            barWidth = 100 - percentElapsed;
            // FIXED: Use formatDate utility
            message = t('predictionWidgetMessages.forDate', { date: formatDate(deadline, i18n.language) });
            break;
        }
        case 'Monthly': {
            deadline = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
            deadline.setUTCHours(20, 0, 0, 0);
            const totalDaysInMonth = deadline.getUTCDate();
            const elapsedDays = now.getUTCDate();
            const penalty = Math.floor((elapsedDays / totalDaysInMonth) * 25);
            maxScore = 100 - penalty;
            barWidth = 100 - (elapsedDays / totalDaysInMonth * 100);
            break;
        }
        case 'Quarterly': {
            deadline.setUTCMonth(now.getUTCMonth() + 3);
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
            maxScore = 100 - penalty;
            barWidth = 100 - (elapsedDays / 365 * 100);
            break;
        }
        default:
            isOpen = false;
            // This message is a fallback and may not appear, but is now translated.
            message = t('predictionWidgetMessages.invalidType');
            break;
    }

    // FIXED: Default message now uses translation key
    message = message || t('predictionWidgetMessages.maxScore', { score: maxScore });
    return { isOpen, message, deadline, barWidth: `${Math.max(0, barWidth)}%` };
};

const PredictionWidget = ({ onClose, initialStock, onInfoClick, onTypesInfoClick, requestConfirmation }) => {
    const { t, i18n } = useTranslation();

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStock, setSelectedStock] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [target, setTarget] = useState('');
    const [description, setDescription] = useState('');
    const [predictionType, setPredictionType] = useState('Weekly');
    const [formState, setFormState] = useState({
        isOpen: true, message: 'Max Score: 100', deadline: null, barWidth: '100%'
    });

    const currentPrice = selectedStock ? selectedStock.regularMarketPrice : 0;

    let percentageChange = 0;
    if (currentPrice > 0 && target) {
        percentageChange = ((parseFloat(target) - currentPrice) / currentPrice) * 100;
    }

    useEffect(() => {
        if (initialStock?.regularMarketPrice) {
            setSelectedStock(initialStock);
            setTarget(initialStock.regularMarketPrice.toFixed(2));
        }
    }, [initialStock]);

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
    }, [predictionType, selectedStock]);

    const handleSelectStock = (symbol) => {
        setIsLoading(true); setError(''); setSearchTerm(''); setSearchResults([]);
        axios.get(`${process.env.REACT_APP_API_URL}/api/quote/${symbol}`)
            .then(res => {
                setSelectedStock(res.data);
                if (res.data.regularMarketPrice) setTarget(res.data.regularMarketPrice.toFixed(2));
            })
            .catch(() => setError('Could not fetch quote.'))
            .finally(() => setIsLoading(false));
    };

    const executePrediction = () => {
        const predictionData = {
            stockTicker: selectedStock.symbol,
            targetPrice: parseFloat(target),
            deadline: formState.deadline,
            predictionType,
            description,
        };
        axios.post(`${process.env.REACT_APP_API_URL}/api/predict`, predictionData, { withCredentials: true })
            .then(() => {
                toast.success(`Prediction for ${selectedStock.symbol} submitted!`);
                onClose();
            })
            .catch(() => toast.error('Failed to submit prediction.'));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!target || parseFloat(target) <= 0 || !selectedStock) return toast.error("Please enter a valid target price.");
        if (!formState.isOpen) return toast.error("Prediction window is closed.");

        const thresholds = { Hourly: 3, Daily: 10, Weekly: 15, Monthly: 20, Quarterly: 40, Yearly: 100 };
        const percentChange = Math.abs(((parseFloat(target) - currentPrice) / currentPrice) * 100);
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

    const predictionTypes = ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

    return (
        <div className="w-full">
            <h2 className="text-2xl font-bold text-white mb-6">{t('prediction.makePrediction')}</h2>

            {!selectedStock && !initialStock ? (
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
                            {searchResults.map((result) => (
                                <li key={result.symbol} onClick={() => handleSelectStock(result.symbol)} className="px-4 py-2 text-white hover:bg-green-500 cursor-pointer">
                                    {result.symbol} - {result.shortname}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : (
                <div className="animate-fade-in">
                    <div className="text-center mb-4">
                        <p className="text-xl font-bold text-white">{selectedStock.symbol}</p>
                        <p className="text-gray-400">
                            {t('prediction.currentPrice')}:&nbsp;
                            <span className="font-semibold text-white">
                                {selectedStock?.regularMarketPrice != null
                                    ? formatCurrency(selectedStock.regularMarketPrice, i18n.language, selectedStock.currency)
                                    : t('prediction.na')}
                            </span>
                        </p>
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
                        <button type="submit" disabled={!formState.isOpen} className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed">
                            {t('prediction.placePrediction')}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default PredictionWidget;