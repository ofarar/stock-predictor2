// server/services/financeAPI.js

// Import the specific provider implementation(s)
const yahooProvider = require('./financeProviders/yahooProvider');
// Future: const alphaVantageProvider = require('./financeProviders/alphaVantageProvider');

// --- Configuration ---
// In the future, you could use an environment variable to choose the provider
const currentProvider = yahooProvider; // For now, we are hardcoding Yahoo

// --- START: ADD THIS CACHE ---
const quoteCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 Minutes
// --- END: ADD THIS CACHE ---

// --- START: ADD THIS COUNTER ---
let apiCallCounter = {
    getQuote: 0,
    getHistorical: 0,
    search: 0,
};
const incrementCounter = (funcName) => {
    if (apiCallCounter.hasOwnProperty(funcName)) {
        apiCallCounter[funcName]++;
    }
};
// Function to send data to the admin panel
const getApiCallStats = () => {
    return apiCallCounter;
};
// --- END: ADD THIS COUNTER ---

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
// --- START: MODIFY THIS FUNCTION ---
const getQuote = async (tickers) => {
    // This function will now use the cache and the counter

    // 1. Handle array case by calling self (this logic is recursive)
    if (Array.isArray(tickers)) {
        const promises = tickers.map(ticker => getQuote(ticker));
        return Promise.all(promises);
    }

    const ticker = tickers;
    const cacheKey = `quote:${ticker}`;
    const now = Date.now();

    // 2. Check for a valid, non-expired cache entry
    if (quoteCache.has(cacheKey)) {
        const cacheEntry = quoteCache.get(cacheKey);
        if (now - cacheEntry.timestamp < CACHE_TTL_MS) {
            // Cache hit! Return the cached data.
            return cacheEntry.data;
        }
    }

    // 3. Cache miss or expired. Increment counter and fetch.
    incrementCounter('getQuote'); // <-- INCREMENT
    const data = await currentProvider.getQuote(ticker);

    // 4. Store the new data in the cache
    quoteCache.set(cacheKey, { data: data, timestamp: now });

    return data;
};
// --- END: MODIFY THIS FUNCTION ---

/**
 * Fetches historical data using the currently configured provider.
 * @param {string} ticker
 * @param {object} queryOptions
 * @returns {Promise<StandardHistoricalPoint[]>}
 */
// --- START: MODIFY THIS FUNCTION ---
const getHistorical = async (ticker, queryOptions) => {
    // 1. Create a unique key based on the ticker and options
    const cacheKey = `hist:${ticker}:${JSON.stringify(queryOptions)}`;
    const now = Date.now();

    // 2. Check for a valid, non-expired cache entry
    if (historicalCache.has(cacheKey)) {
        const cacheEntry = historicalCache.get(cacheKey);
        if (now - cacheEntry.timestamp < HISTORICAL_CACHE_TTL_MS) {
            // Cache hit! Return the cached data.
            return cacheEntry.data;
        }
    }

    // 3. Cache miss or expired. Increment counter and fetch.
    incrementCounter('getHistorical'); // <-- INCREMENT
    const data = await currentProvider.getHistorical(ticker, queryOptions);

    // 4. Store the new data in the cache
    historicalCache.set(cacheKey, { data: data, timestamp: now });

    return data;
};
// --- END: MODIFY THIS FUNCTION ---

/**
 * Searches for symbols using the currently configured provider.
 * @param {string} keyword
 * @returns {Promise<StandardSearchResult[]>}
 */
const search = async (keyword) => {
    incrementCounter('search'); // <-- INCREMENT
    return currentProvider.search(keyword);
};

module.exports = {
    getQuote,
    getHistorical,
    search,
    getApiCallStats
    // You can also export the typedefs if needed elsewhere, though usually not necessary
};