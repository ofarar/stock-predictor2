// src/utils/formatters.js

/**
 * Formats a number into a locale-specific percentage string (e.g., +10.5%, %-5,2).
 * @param {number} value - The percentage value (e.g., 25.5 for 25.5%).
 * @param {string} locale - The language code (e.g., "en", "tr").
 * @returns {string} The formatted percentage string.
 */
export const formatPercentage = (value, locale) => {
    if (typeof value !== 'number') return '';

    // Intl.NumberFormat expects a decimal (e.g., 0.255 for 25.5%)
    const decimalValue = value / 100;

    const formatter = new Intl.NumberFormat(locale, {
        style: 'percent',
        signDisplay: 'always', // Automatically adds '+' for positive numbers
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });

    return formatter.format(decimalValue);
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