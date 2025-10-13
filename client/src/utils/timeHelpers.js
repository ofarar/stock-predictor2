// src/utils/timeHelpers.js

import { formatDate } from './formatters';

export const isMarketOpen = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const day = now.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;
    const isAfterOpen = utcHour > 13 || (utcHour === 13 && now.getUTCMinutes() >= 30);
    const isBeforeClose = utcHour < 20;
    return isWeekday && isAfterOpen && isBeforeClose;
};

export const isPreMarketWindow = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const day = now.getUTCDay();
    const isWeekday = day >= 1 && day <= 5;
    const isInWindow = utcHour === 13 && now.getUTCMinutes() < 30;
    return isWeekday && isInWindow;
};

export const getPredictionDetails = (predictionType, t, i18n) => {
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
                message = t('predictionWidgetMessages.forDate', { date: formatDate(deadline, i18n.language) });
            } else {
                const marketOpen = new Date().setUTCHours(13, 30, 0, 0);
                const elapsedMinutes = Math.max(0, (now.getTime() - marketOpen) / 60000);
                const totalMinutes = 390;
                const penalty = Math.floor(elapsedMinutes / (totalMinutes / 20));
                maxScore = 100 - penalty;
                barWidth = 100 - (elapsedMinutes / totalMinutes * 100);
                message = t('predictionWidgetMessages.maxScore', { score: maxScore });
            }
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
            message = t('predictionWidgetMessages.invalidType');
            break;
    }

    message = message || t('predictionWidgetMessages.maxScore', { score: maxScore });
    return { isOpen, message, deadline, barWidth: `${Math.max(0, barWidth)}%` };
};