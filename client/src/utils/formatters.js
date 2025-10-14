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
    };

    return new Intl.DateTimeFormat(locale, options).format(date);
};

/**
 * Formats a score (0-100) into a locale-specific percentage string without a sign.
 * @param {number} value - The score value (e.g., 75 for 75%).
 * @param {string} locale - The language code (e.g., "en", "tr").
 * @returns {string} The formatted percentage string.
 */
export const formatScorePercentage = (value, locale) => {
    if (typeof value !== 'number') return '';

    const decimalValue = value / 100;
    const formatter = new Intl.NumberFormat(locale, {
        style: 'percent',
        maximumFractionDigits: 0,
    });

    return formatter.format(decimalValue);
};

/**
 * Formats a number into a locale-specific percentage string (e.g., +10.5%, %-5,2).
 * @param {number} value - The percentage value (e.g., 25.5 for 25.5%).
 * @param {string} locale - The language code (e.g., "en", "tr").
 * @returns {string} The formatted percentage string.
 */
export const formatPercentage = (value, locale) => {
    if (typeof value !== 'number' || isNaN(value)) return '';

    const decimalValue = value / 100;

    const formatter = new Intl.NumberFormat(locale, {
        style: 'percent',
        signDisplay: 'always', // Use the built-in sign display
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });

    let formatted = formatter.format(decimalValue);

    // --- Special Fix for Turkish Negative Percentages ---
    if (locale === 'tr' && value < 0) {
        // Changes "-%2,5" to "%-2,5"
        formatted = formatted.replace("-%", "%-");
    }
    // ---------------------------------------------------

    return formatted;
};

/**
 * Formats a number into a locale-specific currency string (e.g., $245.50).
 * @param {number} value - The numerical value to format.
 * @param {string} locale - The language code (e.g., "en", "tr").
 * @returns {string} The formatted currency string.
 */
export const formatCurrency = (value, locale, currency = 'USD') => {
    if (typeof value !== 'number') return '';

    const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency, // <-- USE THE DYNAMIC CURRENCY
    });

    return formatter.format(value);
};

/**
 * Formats a date object into a locale-specific string (e.g., "Oct 12, 2025").
 * @param {Date} date - The date object to format.
 * @param {string} locale - The language code (e.g., "en", "tr").
 * @returns {string} The formatted date string.
 */
export const formatDate = (date, locale) => {
    if (!(date instanceof Date)) return '';

    const options = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
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
    };

    return new Intl.DateTimeFormat(locale, options).format(date);
};