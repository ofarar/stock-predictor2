// src/utils/timeHelpers.js
import { DateTime } from 'luxon';
import { getExchangeConfig } from './marketConfig';
import { formatDate } from './formatters';

/**
 * Checks if the market for a specific ticker is currently open.
 * Handles Timezones, Weekends, and 24/7 assets automatically.
 */
export const isMarketOpen = (ticker) => {
    const config = getExchangeConfig(ticker);

    if (config.is247) return true; // Crypto is always open

    // Get current time in the target market's timezone
    const now = DateTime.now().setZone(config.timezone);

    // 1. Check Weekend
    // Luxon: 1=Mon...6=Sat, 7=Sun
    if (now.weekday > 5) return false;

    // Special case for Forex (Closed Fri 5PM to Sun 5PM EST)
    if (config.is245) {
        if (now.weekday === 5 && now.hour >= 17) return false; // Friday after 5PM
        if (now.weekday === 6) return false; // Saturday
        if (now.weekday === 7 && now.hour < 17) return false; // Sunday before 5PM
        return true;
    }

    // 2. Check Hours
    const openTime = now.set(config.open);
    const closeTime = now.set(config.close);

    return now >= openTime && now <= closeTime;
};

export const isPreMarketWindow = (ticker) => {
    const config = getExchangeConfig(ticker);
    if (config.is247 || config.is245) return false; // No pre-market for crypto/forex

    const now = DateTime.now().setZone(config.timezone);
    const openTime = now.set(config.open);

    // Define Pre-market as 30 mins before open
    const preMarketStart = openTime.minus({ minutes: 30 });

    return now >= preMarketStart && now < openTime && now.weekday <= 5;
};

export const getPredictionDetails = (predictionType, t, i18n, ticker) => {
    const config = getExchangeConfig(ticker);
    const now = DateTime.now().setZone(config.timezone);

    let deadline = now;
    let message = '';
    let barWidth = 100;
    let maxScore = 100;
    let isOpen = true;

    // Check market status first
    const marketOpen = isMarketOpen(ticker);

    switch (predictionType) {
        case 'Hourly': {
            if (isPreMarketWindow(ticker)) {
                // If pre-market, deadline is 1 hour after open
                const openTime = now.set(config.open);
                deadline = openTime.plus({ hours: 1 });
                message = t('predictionWidgetMessages.openingHourPrediction');
                isOpen = true;
            } else if (marketOpen) {
                const elapsedMinutes = now.minute;
                const penalty = elapsedMinutes > 10 ? Math.floor(((elapsedMinutes - 10) / 50) * 20) : 0;
                maxScore = 100 - penalty;
                barWidth = 100 - (elapsedMinutes / 60 * 100);

                // Deadline is start of next hour
                deadline = now.plus({ hours: 1 }).startOf('hour');
                isOpen = true;
            } else {
                isOpen = false;
                message = t('predictionWidgetMessages.marketClosed');
                barWidth = 0;
            }
            break;
        }
        case 'Daily': {
            const closeTime = now.set(config.close);

            // If it's after close (or weekend), move to next trading day
            if (now > closeTime || now.weekday > 5) {
                deadline = deadline.plus({ days: 1 });
                while (deadline.weekday > 5) { // Skip weekends
                    deadline = deadline.plus({ days: 1 });
                }
            }

            // Set deadline to market close
            deadline = deadline.set(config.close);

            // Calculate Score Penalty
            if (deadline.hasSame(now, 'day')) {
                const openTime = now.set(config.open);
                const totalMinutes = closeTime.diff(openTime, 'minutes').minutes;
                const elapsedMinutes = Math.max(0, now.diff(openTime, 'minutes').minutes);

                const penalty = Math.floor(elapsedMinutes / (totalMinutes / 20));
                maxScore = 100 - penalty;
                barWidth = 100 - (elapsedMinutes / totalMinutes * 100);
                message = t('predictionWidgetMessages.maxScore', { score: maxScore });
            } else {
                message = t('predictionWidgetMessages.forDate', { date: formatDate(deadline.toJSDate(), i18n.language) });
            }
            break;
        }
        case 'Weekly': {
            // Find next Friday
            const daysUntilFriday = (5 - now.weekday + 7) % 7;
            deadline = now.plus({ days: daysUntilFriday }).set(config.close);

            // If today is Friday and market is closed/closing, move to next week
            if (now.weekday === 5 && now > now.set(config.close)) {
                deadline = deadline.plus({ weeks: 1 });
            }

            const startOfWeek = deadline.minus({ days: 4 }).set(config.open);
            const totalMillis = deadline.diff(startOfWeek).milliseconds;
            const elapsedMillis = Math.max(0, now.diff(startOfWeek).milliseconds);

            const percentElapsed = (elapsedMillis / totalMillis) * 100;
            const penalty = Math.floor(percentElapsed / (100 / 20));
            maxScore = Math.max(80, 100 - penalty); // Cap min score at 80 for weekly
            barWidth = 100 - percentElapsed;
            message = t('predictionWidgetMessages.forDate', { date: formatDate(deadline.toJSDate(), i18n.language) });
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
            // Fallback for long term using standard JS dates
            const jsDeadline = new Date();
            if (predictionType === 'Monthly') jsDeadline.setMonth(jsDeadline.getMonth() + 1, 0);
            if (predictionType === 'Quarterly') jsDeadline.setMonth(jsDeadline.getMonth() + 3);
            if (predictionType === 'Yearly') jsDeadline.setFullYear(jsDeadline.getFullYear() + 1, 0, 1); // End of year
            deadline = DateTime.fromJSDate(jsDeadline);
            break;
    }

    message = message || t('predictionWidgetMessages.maxScore', { score: maxScore });
    return {
        isOpen,
        message,
        deadline: deadline.toJSDate(),
        barWidth: `${Math.max(0, barWidth)}%`
    };
};