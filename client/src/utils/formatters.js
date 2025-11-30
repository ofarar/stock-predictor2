// src/utils/formatters.js

/**
 * Formats a date into a short, numeric, locale-specific string.
 * @param {string | Date} dateInput - The date object or string to format.
 * @param {string} locale - The language code (e.g., "en", "tr").
 * @returns {string} The formatted date string (e.g., "10/9/2025").
 */
export const formatNumericDate = (dateInput, locale) => {
    const date = new Date(dateInput);
    if (isNaN(date)) return '';

    const options = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        numberingSystem: 'latn'
    };

    return new Intl.DateTimeFormat(locale, options).format(date);
};

export const formatTimeLeft = (milliseconds, t) => {
    if (milliseconds < 0) return `0${t('time.minutes', 'm')} 0${t('time.seconds', 's')}`;

    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let parts = [];
    if (days > 0) parts.push(`${days}${t('time.days', 'd')}`);
    if (hours > 0) parts.push(`${hours}${t('time.hours', 'h')}`);
    if (minutes > 0 || (days === 0 && hours === 0)) parts.push(`${minutes}${t('time.minutes', 'm')}`);
    if (seconds >= 0) parts.push(`${seconds}${t('time.seconds', 's')}`);

    return parts.join(' ');
};

/**
 * Formats a score (0-100) into a locale-specific percentage string without a sign.
 * @param {number} value - The score value (e.g., 75 for 75%).
 * @param {string} locale - The language code (e.g., "en", "tr").
 * @returns {string} The formatted date string.
 */
export const formatDate = (date, locale) => {
    if (!(date instanceof Date)) return '';

    const options = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        numberingSystem: 'latn'
    };

    return new Intl.DateTimeFormat(locale, options).format(date);
};

/**
 * Formats a date object into a locale-specific date and time string.
 * @param {string | Date} dateInput - The date object or string to format.
 * @param {string} locale - The language code (e.g., "en", "tr").
 * @returns {string} The formatted date and time string.
 */
export const formatDateTime = (dateInput, locale) => {
    const date = new Date(dateInput);
    if (isNaN(date)) return '';

    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        numberingSystem: 'latn'
    };

    return new Intl.DateTimeFormat(locale, options).format(date);
};

/**
 * Formats a date object into a locale-specific short date and time string.
 * @param {string | Date} dateInput - The date object or string to format.
 * @param {string} locale - The language code (e.g., "en", "tr").
 * @returns {string} The formatted short date/time string (e.g., "10/19/25, 4:30 PM").
 */
export const formatDateTimeShort = (dateInput, locale) => {
    const date = new Date(dateInput);
    if (isNaN(date)) return '';

    const options = {
        year: '2-digit', // Short year
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        numberingSystem: 'latn'
    };

    return new Intl.DateTimeFormat(locale, options).format(date);
};

/**
 * Formats a number using Western Arabic numerals (0-9) regardless of locale.
 * @param {number} value - The number to format.
 * @param {string} locale - The language code.
 * @param {object} options - Intl.NumberFormat options.
 * @returns {string} The formatted number string.
 */
export const formatNumber = (value, locale, options = {}) => {
    if (value === undefined || value === null) return '';
    return new Intl.NumberFormat(locale, { ...options, numberingSystem: 'latn' }).format(value);
};

export const formatPercentage = (value, locale, options = {}) => {
    return formatNumber(value / 100, locale, {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        ...options
    });
};

export const formatCurrency = (value, locale, currency = 'USD', options = {}) => {
    return formatNumber(value, locale, {
        style: 'currency',
        currency: currency,
        ...options
    });
};

/**
 * Formats the Creator Pool Share percentage to XX.YY% precision.
 */
export const formatSharePercentage = (value, locale) => {
    // FIX: Changed minimum and maximum fraction digits from 4 to 2
    return formatNumber(value, locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + '%';
};