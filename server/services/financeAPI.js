const yahooProvider = require('./financeProviders/yahooProvider');
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
 * Fetches earnings data from NASDAQ API for the next 7 days.
 * Filters by Market Cap to show only "popular" stocks (> $100B).
 * @returns {Promise<Array>} List of upcoming earnings events.
 */
const fetchNasdaqEarningsCalendar = async () => {
    // Only call this function if the main finance API is enabled
    if (!(await isFinanceApiEnabled())) {
        return [];
    }

    // 1. Check batch cache
    if (quoteCache.has(BATCH_EARNINGS_CALENDAR_CACHE_KEY)) {
        const cacheEntry = quoteCache.get(BATCH_EARNINGS_CALENDAR_CACHE_KEY);
        if (Date.now() - cacheEntry.timestamp < EARNINGS_CACHE_TTL_MS) {
            console.log("Serving earnings calendar from NASDAQ cache.");
            return cacheEntry.data;
        }
    }

    console.log("Fetching earnings calendar from NASDAQ...");
    const allEarnings = [];
    const today = new Date();
    // MARKET_CAP_THRESHOLD is imported from constants.js

    // Loop for the next 7 days
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

        try {
            const url = `https://api.nasdaq.com/api/calendar/earnings?date=${dateString}`;
            // NASDAQ API requires User-Agent header to look like a browser
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Referer': 'https://www.nasdaq.com/'
                },
                timeout: 5000
            });

            if (response.data && response.data.data && response.data.data.rows) {
                const rows = response.data.data.rows;

                // Filter and Map
                const dailyEarnings = rows.filter(row => {
                    // Parse Market Cap: "$134,659,180,037" -> 134659180037
                    if (!row.marketCap || row.marketCap === 'N/A') return false;
                    const marketCapStr = row.marketCap.replace(/[$,]/g, '');
                    const marketCap = parseFloat(marketCapStr);
                    return marketCap >= MARKET_CAP_THRESHOLD;
                }).map(row => ({
                    ticker: row.symbol,
                    earningsDate: dateString,
                    time: row.time === 'time-not-supplied' ? 'N/A' : row.time, // NASDAQ often returns 'time-not-supplied'
                    name: row.name,
                    epsForecast: row.epsForecast
                }));

                allEarnings.push(...dailyEarnings);
            }

            // Be nice to the API
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error(`Failed to fetch NASDAQ earnings for ${dateString}:`, error.message);
            // Continue to next day even if one fails
        }
    }

    console.log(`Fetched ${allEarnings.length} earnings events from NASDAQ.`);

    // Cache the results
    if (allEarnings.length > 0) {
        quoteCache.set(BATCH_EARNINGS_CALENDAR_CACHE_KEY, { data: allEarnings, timestamp: Date.now() });
    }

    return allEarnings;
};

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
    // (We assume getProvider(ticker) correctly returns cryptoProvider or yahooProvider)
    const provider = getProvider(ticker);

    // 5. Increment counter and fetch data from the external API
    incrementCounter('getQuote'); // Only increment on cache miss

    // Note: If this fails for Crypto, the error is immediately reported to the user console (429)
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

const getEarningsCalendar = async () => {
    // This is now simplified to call the cached batch fetcher
    return fetchNasdaqEarningsCalendar();
};

module.exports = {
    getQuote,
    getHistorical,
    search,
    getApiCallStats,
    getEarningsCalendar,
    // You can also export the typedefs if needed elsewhere, though usually not necessary
};