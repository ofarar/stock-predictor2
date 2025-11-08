const yahooProvider = require('./financeProviders/yahooProvider');
const currentProvider = yahooProvider;
const Setting = require('../models/Setting'); // <-- 1. IMPORT SETTING MODEL

// --- Cache for API calls ---
const quoteCache = new Map();
const historicalCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000;
const HISTORICAL_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// --- Cache for the API setting itself (so we don't hit the DB every time) ---
let financeApiEnabled = true;
let settingLastChecked = 0;
const SETTING_CACHE_TTL_MS = 60 * 1000; // 1 Minute

/**
 * Checks if the finance API is enabled in settings.
 * Uses a 1-minute cache to avoid constant DB calls.
 */
async function isFinanceApiEnabled() {
    const now = Date.now();
    if (now - settingLastChecked > SETTING_CACHE_TTL_MS) {
        try {
            const settings = await Setting.findOne();
            financeApiEnabled = settings ? settings.isFinanceApiEnabled : true;
        } catch (err) {
            console.error("Could not fetch finance API setting, defaulting to true.", err);
            financeApiEnabled = true;
        }
        settingLastChecked = now;
    }
    return financeApiEnabled;
}


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
    // --- 2. ADD THIS CHECK ---
    if (!(await isFinanceApiEnabled())) {
        console.warn("Finance API is disabled. Returning null for getQuote.");
        // Return null or an empty array to match what the app expects on failure
        return Array.isArray(tickers) ? [] : null;
    }
    // --- END CHECK ---
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
    // --- 3. ADD THIS CHECK ---
    if (!(await isFinanceApiEnabled())) {
        console.warn("Finance API is disabled. Returning [] for getHistorical.");
        return []; // Return an empty array
    }
    // --- END CHECK ---
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
    // --- 4. ADD THIS CHECK ---
    if (!(await isFinanceApiEnabled())) {
        console.warn("Finance API is disabled. Returning [] for search.");
        return []; // Return an empty array
    }
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