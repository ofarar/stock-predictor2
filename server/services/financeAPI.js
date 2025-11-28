const yahooProvider = require('./financeProviders/yahooProvider');
const nasdaqEarningProvider = require('./financeProviders/nasdaqEarningProvider');
const currentProvider = yahooProvider;
const Setting = require('../models/Setting');
const cryptoProvider = require('./financeProviders/cryptoProvider');
const axios = require('axios');
const { MARKET_CAP_THRESHOLD } = require('../constants');

// --- NEW HELPER: Dynamically selects the correct provider ---
const getProvider = (ticker) => {
    if (ticker.includes('-USD') || ticker.endsWith('BTC') || ticker.endsWith('ETH')) {
        return cryptoProvider; // Use CoinGecko
    }
    return currentProvider; // Default to Yahoo
};
// -------------------------------------------------------------

// --- Cache for API calls ---
const quoteCache = new Map();
const historicalCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000;
const HISTORICAL_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// --- Cache for the API setting itself (so we don't hit the DB every time) ---
let financeApiEnabled = true;
let settingLastChecked = 0;
const SETTING_CACHE_TTL_MS = 60 * 1000; // 1 Minute

// --- Configuration ---
const BATCH_EARNINGS_CALENDAR_CACHE_KEY = 'batch:earnings:nasdaq';
const EARNINGS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // Cache for 24 hours

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
    // --- NEW COUNTER ---
    getEarningsCalendar: 0,
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
 * Fetches quote data using the appropriate provider, enforced by cache.
 * @param {string|string[]} tickers
 * @returns {Promise<StandardQuote|StandardQuote[]|null>}
 */
const getQuote = async (tickers) => {
    // --- 1. Global Safety Check (Correct) ---
    if (!(await isFinanceApiEnabled())) {
        console.warn("Finance API is disabled. Returning null for getQuote.");
        return Array.isArray(tickers) ? [] : null;
    }

    // 2. Handle array case by calling self (Correct)
    if (Array.isArray(tickers)) {
        const promises = tickers.map(ticker => getQuote(ticker));
        return Promise.all(promises);
    }

    const ticker = tickers;
    const cacheKey = `quote:${ticker}`;
    const now = Date.now();

    // --- 3. MISSING CHECK (CRITICAL): Check Cache FIRST ---
    if (quoteCache.has(cacheKey)) {
        const cacheEntry = quoteCache.get(cacheKey);
        // CACHE_TTL_MS is 2 minutes, throttling external API calls
        if (now - cacheEntry.timestamp < CACHE_TTL_MS) {
            console.log(`Serving quote for ${ticker} from cache.`);
            return cacheEntry.data;
        }
    }
    // --- END MISSING CHECK ---

    // 4. Cache miss: Determine provider and fetch data
    const provider = getProvider(ticker);

    // 5. Increment counter and fetch data from the external API
    incrementCounter('getQuote'); // Only increment on cache miss

    const data = await provider.getQuote(ticker);

    // 6. Store the new data in the cache (for both Yahoo and Crypto)
    quoteCache.set(cacheKey, { data: data, timestamp: now });

    return data;
};

/**
 * Fetches historical data using the currently configured provider.
 * @param {string} ticker
 * @param {object} queryOptions
 * @returns {Promise<StandardHistoricalPoint[]>}
 */
const getHistorical = async (ticker, queryOptions) => {
    if (!(await isFinanceApiEnabled())) {
        console.warn("Finance API is disabled. Returning [] for getHistorical.");
        return []; // Return an empty array
    }
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

// --- MODIFIED FUNCTION: Uses the new nasdaqEarningProvider ---
const getEarningsCalendar = async () => {
    if (!(await isFinanceApiEnabled())) {
        console.warn("Finance API is disabled. Returning [] for Earnings Calendar.");
        return [];
    }

    // 1. Check cache (Cachin logic remains here, the adapter)
    if (quoteCache.has(BATCH_EARNINGS_CALENDAR_CACHE_KEY)) {
        const cacheEntry = quoteCache.get(BATCH_EARNINGS_CALENDAR_CACHE_KEY);
        if (Date.now() - cacheEntry.timestamp < EARNINGS_CACHE_TTL_MS) {
            console.log("Serving earnings calendar from NASDAQ cache.");
            return cacheEntry.data;
        }
    }

    // 2. Cache miss: Fetch data from the new provider
    incrementCounter('getEarningsCalendar'); // Increment the new counter
    // DELEGATE THE FETCH AND FILTERING TO THE NEW PROVIDER
    const allEarnings = await nasdaqEarningProvider.fetchCalendar();

    // 3. Cache the results
    if (allEarnings.length > 0) {
        quoteCache.set(BATCH_EARNINGS_CALENDAR_CACHE_KEY, { data: allEarnings, timestamp: Date.now() });
    }

    return allEarnings;
};
// --- END MODIFIED FUNCTION ---

module.exports = {
    getQuote,
    getHistorical,
    search,
    getApiCallStats,
    getEarningsCalendar,
};