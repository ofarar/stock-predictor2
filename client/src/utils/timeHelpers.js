// src/utils/timeHelpers.js
import { DateTime } from 'luxon';
import { getExchangeConfig } from './marketConfig';
import { formatDate } from './formatters';
import { THRESHOLDS } from '../constants';

/**
 * Checks if the market for a specific ticker is currently open.
 * @param {string} ticker
 * @param {string} marketState - The 'marketState' string from the API (e.g., "REGULAR", "CLOSED")
 * @returns {boolean}
 */
export const isMarketOpen = (ticker, marketState) => {
    const config = getExchangeConfig(ticker);

    if (config.is247) return true; // Crypto is always open

    // 1. Primary Check: Use the API's reported state. This handles ALL holidays.
    if (marketState) {
        return marketState === 'REGULAR';
    }

    // 2. Fallback Check: If no marketState is provided, use the Luxon time check.
    // This is for when we don't have a live quote (e.g., before user has searched).
    const now = DateTime.now().setZone(config.timezone);

    if (now.weekday > 5) return false; // Weekends

    if (config.is245) { // Forex logic
        if (now.weekday === 5 && now.hour >= 17) return false; // Fri after 5PM
        if (now.weekday === 6) return false; // Sat
        if (now.weekday === 7 && now.hour < 17) return false; // Sun before 5PM
        return true;
    }

    const openTime = now.set(config.open);
    const closeTime = now.set(config.close);

    return now >= openTime && now <= closeTime;
};

/**
 * Checks for the pre-market window for a specific ticker.
 * @param {string} ticker
 * @param {string} marketState - The 'marketState' string from the API
 * @returns {boolean}
 */
export const isPreMarketWindow = (ticker, marketState) => {
    // 1. Primary Check: Use the API's reported state.
    if (marketState) {
        return marketState === 'PRE';
    }

    // 2. Fallback Check: Use Luxon time check.
    const config = getExchangeConfig(ticker);
    if (config.is247 || config.is245) return false;

    const now = DateTime.now().setZone(config.timezone);
    const openTime = now.set(config.open);
    const preMarketStart = openTime.minus({ minutes: 30 });

    return now >= preMarketStart && now < openTime && now.weekday <= 5;
};

/**
 * Calculates deadline, penalty, and messages for the Prediction Widget
 * based on the specific asset's market rules.
 */
export const getPredictionDetails = (predictionType, t, i18n, stock) => {
    // stock can be null, or { symbol, marketState }
    const ticker = stock?.symbol;
    const marketState = stock?.marketState;

    const config = getExchangeConfig(ticker);
    const now = DateTime.now().setZone(config.timezone);

    let deadline = now;
    let message = '';
    let barWidth = 100;
    let maxScore = 100;
    let isOpen = true;

    // Use the new, robust market/holiday-aware function
    const marketOpen = isMarketOpen(ticker, marketState);
    const preMarket = isPreMarketWindow(ticker, marketState);

    switch (predictionType) {
        case 'Hourly': {
            if (preMarket) {
                deadline = now.set(config.open).plus({ hours: 1 });
                message = t('predictionWidgetMessages.openingHourPrediction');
            } else if (marketOpen) {
                const elapsedMinutes = now.minute;
                const penaltyStart = THRESHOLDS.TIME_PENALTY_HOURLY_START_MIN;
                const maxLoss = THRESHOLDS.TIME_PENALTY_HOURLY_MAX_LOSS;
                const penalty = elapsedMinutes > penaltyStart ? Math.floor(((elapsedMinutes - penaltyStart) / (60 - penaltyStart)) * maxLoss) : 0;
                maxScore = 100 - penalty;
                barWidth = 100 - (elapsedMinutes / 60 * 100);
                deadline = now.plus({ hours: 1 }).startOf('hour');
            } else {
                // Market is not open (either closed or holiday)
                isOpen = false;
                message = t('predictionWidgetMessages.marketClosed');
                barWidth = 0;
            }
            break;
        }
        case 'Daily': {
            const closeTime = now.set(config.close);

            // If it's after close OR it's not open (i.e., a holiday) OR it's a weekend
            if (now > closeTime || !marketOpen || now.weekday > 5) {
                deadline = deadline.plus({ days: 1 });
            }

            // Now, find the next valid trading day (skip weekends)
            // (Note: This still doesn't know about *future* holidays, but it's much better)
            while (deadline.weekday > 5) {
                deadline = deadline.plus({ days: 1 });
            }

            deadline = deadline.set(config.close);

            if (deadline.hasSame(now, 'day') && marketOpen) {
                const openTime = now.set(config.open);
                const totalMinutes = closeTime.diff(openTime, 'minutes').minutes;
                const elapsedMinutes = Math.max(0, now.diff(openTime, 'minutes').minutes);

                const penalty = Math.floor(elapsedMinutes / (totalMinutes / 20));
                maxScore = 100 - penalty;
                barWidth = 100 - (elapsedMinutes / totalMinutes * 100);
                message = t('predictionWidgetMessages.maxRating', { rating: maxScore });
            } else {
                // This is the case for "next open day"
                message = t('predictionWidgetMessages.forDate', { date: formatDate(deadline.toJSDate(), i18n.language) });
            }
            break;
        }
        // ... (Weekly, Monthly, Quarterly, Yearly are unchanged) ...
        case 'Weekly': {
            deadline = now.set({ weekday: 5 }).set(config.close); // Set to this Friday's close
            if (now > deadline) {
                deadline = deadline.plus({ weeks: 1 });
            }
            const startOfWeek = deadline.minus({ days: 4 }).set(config.open);
            const totalMillis = deadline.diff(startOfWeek).milliseconds;
            const elapsedMillis = Math.max(0, now.diff(startOfWeek).milliseconds);
            const percentElapsed = (elapsedMillis / totalMillis) * 100;
            const penalty = Math.floor(percentElapsed / (100 / THRESHOLDS.TIME_PENALTY_WEEKLY_MAX_LOSS));
            maxScore = Math.max(80, 100 - penalty);
            barWidth = 100 - percentElapsed;
            message = t('predictionWidgetMessages.forDate', { date: formatDate(deadline.toJSDate(), i18n.language) });
            break;
        }
        case 'Monthly': {
            deadline = now.endOf('month').set(config.close);
            if (now > deadline) {
                deadline = now.plus({ months: 1 }).endOf('month').set(config.close);
            }
            const totalDaysInMonth = now.daysInMonth;
            const elapsedDays = now.day;
            const penalty = Math.floor((elapsedDays / totalDaysInMonth) * THRESHOLDS.TIME_PENALTY_MONTHLY_MAX_LOSS);
            maxScore = 100 - penalty;
            barWidth = 100 - (elapsedDays / totalDaysInMonth * 100);
            break;
        }
        case 'Quarterly': {
            deadline = now.endOf('quarter').set(config.close);
            if (now > deadline) {
                deadline = now.plus({ quarters: 1 }).endOf('quarter').set(config.close);
            }
            const startOfQuarter = now.startOf('quarter');
            const totalDays = deadline.diff(startOfQuarter, 'days').days;
            const elapsedDays = now.diff(startOfQuarter, 'days').days;
            const penalty = Math.floor((elapsedDays / totalDays) * THRESHOLDS.TIME_PENALTY_QUARTERLY_MAX_LOSS);
            maxScore = 100 - penalty;
            barWidth = 100 - (elapsedDays / totalDays * 100);
            break;
        }
        case 'Yearly': {
            deadline = now.endOf('year').set(config.close);
            const startOfYear = now.startOf('year');
            const elapsedDays = now.diff(startOfYear, 'days').days;
            const penalty = Math.floor((elapsedDays / 365) * THRESHOLDS.TIME_PENALTY_YEARLY_MAX_LOSS);
            maxScore = 100 - penalty;
            barWidth = 100 - (elapsedDays / 365 * 100);
            break;
        }
        default:
            isOpen = false;
            message = t('predictionWidgetMessages.invalidType');
            break;
    }

    message = message || t('predictionWidgetMessages.maxRating', { score: maxScore });

    // Final check for Hourly
    if (predictionType === 'Hourly' && !marketOpen && !preMarket) {
        isOpen = false;
        message = t('predictionWidgetMessages.marketClosed');
        barWidth = 0;
    }

    // Final check for Daily
    if (predictionType === 'Daily' && !marketOpen && !deadline.hasSame(now, 'day')) {
        // This is fine, it's a prediction for the next open day.
    }

    return {
        isOpen,
        message,
        deadline: deadline.toJSDate(),
        barWidth: `${Math.max(0, barWidth)}%`
    };
};