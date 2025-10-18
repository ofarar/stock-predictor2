// server/services/financeAPI.js

// Import the specific provider implementation(s)
const yahooProvider = require('./financeProviders/yahooProvider');
// Future: const alphaVantageProvider = require('./financeProviders/alphaVantageProvider');

// --- Configuration ---
// In the future, you could use an environment variable to choose the provider
const currentProvider = yahooProvider; // For now, we are hardcoding Yahoo

// --- Standardized Type Definitions (Keep these here) ---
/**
 * Standardized format for quote data.
 * @typedef {object} StandardQuote
 * @property {string} symbol
 * @property {string|null} name
 * @property {number|null} price
 * @property {number|null} changeAbsolute
 * @property {number|null} changePercent
 * @property {string|null} currency
 * @property {number|null} previousClose
 */
// ... (keep your other typedefs for StandardHistoricalPoint, StandardSearchResult)


// --- Exported Adapter Functions (Delegate to the selected provider) ---

/**
 * Fetches quote data using the currently configured provider.
 * @param {string|string[]} tickers
 * @returns {Promise<StandardQuote|StandardQuote[]|null>}
 */
const getQuote = async (tickers) => {
    // Simply call the corresponding function from the selected provider
    return currentProvider.getQuote(tickers);
};

/**
 * Fetches historical data using the currently configured provider.
 * @param {string} ticker
 * @param {object} queryOptions
 * @returns {Promise<StandardHistoricalPoint[]>}
 */
const getHistorical = async (ticker, queryOptions) => {
    return currentProvider.getHistorical(ticker, queryOptions);
};

/**
 * Searches for symbols using the currently configured provider.
 * @param {string} keyword
 * @returns {Promise<StandardSearchResult[]>}
 */
const search = async (keyword) => {
    return currentProvider.search(keyword);
};

module.exports = {
    getQuote,
    getHistorical,
    search,
    // You can also export the typedefs if needed elsewhere, though usually not necessary
};