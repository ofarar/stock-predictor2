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