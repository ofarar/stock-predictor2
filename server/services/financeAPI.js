// server/services/financeAPI.js

const yahooFinance = require('yahoo-finance2').default;

/**
 * Standardized format for quote data.
 * @typedef {object} StandardQuote
 * @property {string} symbol
 * @property {string|null} name
 * @property {number|null} price
 * @property {number|null} changeAbsolute
 * @property {number|null} changePercent
 * @property {string|null} currency
 * @property {number|null} previousClose - Needed for some calculations
 */

/**
 * Standardized format for historical data point.
 * @typedef {object} StandardHistoricalPoint
 * @property {Date} date
 * @property {number} close
 */

/**
 * Standardized format for search result.
 * @typedef {object} StandardSearchResult
 * @property {string} symbol
 * @property {string|null} name
 */


/**
 * Maps the yahoo-finance2 quote response to our standard format.
 * @param {object} yfQuote - The quote object from yahoo-finance2.
 * @returns {StandardQuote|null} - The standardized quote or null.
 */
const mapYahooQuote = (yfQuote) => {
    if (!yfQuote) return null;
    return {
        symbol: yfQuote.symbol,
        name: yfQuote.longName || yfQuote.shortName || null,
        price: yfQuote.regularMarketPrice ?? yfQuote.marketPrice ?? yfQuote.regularMarketPreviousClose ?? null, // Prioritize different price fields
        changeAbsolute: yfQuote.regularMarketChange ?? null,
        changePercent: yfQuote.regularMarketChangePercent ?? null,
        currency: yfQuote.currency || null,
        previousClose: yfQuote.regularMarketPreviousClose ?? null, // Keep previous close
        // Add any other fields you consistently need from the original quote
        // For example:
        // marketState: yfQuote.marketState,
        // volume: yfQuote.regularMarketVolume
    };
};

/**
 * Fetches quote data for one or more symbols and returns it in a standardized format.
 * Handles resilience internally.
 * @param {string|string[]} tickers - A single ticker or an array of tickers.
 * @returns {Promise<StandardQuote|StandardQuote[]|null>} - Standardized quote(s) or null on critical error.
 */
const getQuote = async (tickers) => {
    try {
        const result = await yahooFinance.quote(tickers);
        if (Array.isArray(result)) {
            // Map each quote, filter out nulls if any individual fetch failed within the library
            return result.map(mapYahooQuote).filter(q => q !== null);
        } else if (result) {
            return mapYahooQuote(result); // Single quote result
        }
        return Array.isArray(tickers) ? [] : null; // Return empty array or null if no results
    } catch (error) {
        console.error(`FinanceAPI Adapter (getQuote for ${tickers}): Error fetching from source. ${error.message}`);
        // Return empty array for multi-ticker requests, null for single ticker on error
        return Array.isArray(tickers) ? [] : null;
    }
};

/**
 * Fetches historical data for a symbol and returns it in a standardized format.
 * Handles resilience internally.
 * @param {string} ticker - The stock ticker.
 * @param {object} queryOptions - Options like period1, period2.
 * @returns {Promise<StandardHistoricalPoint[]>} - Array of standardized historical points, empty on error.
 */
const getHistorical = async (ticker, queryOptions) => {
    try {
        const results = await yahooFinance.historical(ticker, queryOptions);
        // Map to our standard format
        return results.map(point => ({
            date: point.date,
            close: point.close,
        }));
    } catch (error) {
        console.error(`FinanceAPI Adapter (getHistorical for ${ticker}): Error fetching from source. ${error.message}`);
        return []; // Return empty array on error
    }
};

/**
 * Searches for symbols and returns results in a standardized format.
 * Handles resilience internally.
 * @param {string} keyword - The search keyword.
 * @returns {Promise<StandardSearchResult[]>} - Array of standardized search results, empty on error.
 */
const search = async (keyword) => {
    try {
        const results = await yahooFinance.search(keyword);
        // Map to our standard format
        return (results.quotes || []).map(q => ({
            symbol: q.symbol,
            name: q.shortname || q.longname || null,
        }));
    } catch (error) {
        console.error(`FinanceAPI Adapter (search for ${keyword}): Error fetching from source. ${error.message}`);
        // If API fails, create a fallback result so the user can still add the ticker manually
        return [{
            symbol: keyword.toUpperCase(),
            name: `Add "${keyword.toUpperCase()}" manually`,
            // isFallback: true // You could add a flag if needed
        }];
    }
};

module.exports = {
    getQuote,
    getHistorical,
    search,
};