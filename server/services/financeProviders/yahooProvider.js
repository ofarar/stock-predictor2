// server/services/financeProviders/yahooProvider.js

let yahooFinanceInstance;

/**
 * Initializes and returns the v3 YahooFinance instance.
 * Handles the async import() for ESM compatibility.
 */
async function getYahooInstance() {
    if (yahooFinanceInstance) return yahooFinanceInstance;

    try {
        // Use async import() to load the ESM 'yahoo-finance2' module
        const { default: YahooFinance } = await import('yahoo-finance2');

        // Initialize with new v3 syntax (as per your documentation)
        yahooFinanceInstance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

        console.log("Yahoo Finance v3 provider initialized successfully.");
        return yahooFinanceInstance;
    } catch (err) {
        console.error("FATAL: Failed to initialize yahoo-finance2 v3.", err);
        throw new Error("Could not load finance provider.");
    }
}


// --- Helper Functions (Mapping) ---
// These map the v3 response to the "Standard Format" your app expects.
// Your StockPage.js looks for fields like 'regularMarketPrice', so we provide them.

const mapYahooQuote = (yfQuote) => {
    if (!yfQuote) return null;
    return {
        symbol: yfQuote.symbol,
        name: yfQuote.longName || yfQuote.shortName || null,
        price: yfQuote.regularMarketPrice ?? yfQuote.marketPrice ?? yfQuote.regularMarketPreviousClose ?? null,
        changeAbsolute: yfQuote.regularMarketChange ?? null,
        changePercent: yfQuote.regularMarketChangePercent ?? null,
        currency: yfQuote.currency || null,
        previousClose: yfQuote.regularMarketPreviousClose ?? null,
        // --- v3 FIX ---
        // Map the v3 names to the v2 names your frontend expects
        longName: yfQuote.longName || yfQuote.shortName || null,
        regularMarketPrice: yfQuote.regularMarketPrice ?? null,
        regularMarketChange: yfQuote.regularMarketChange ?? null,
        regularMarketChangePercent: yfQuote.regularMarketChangePercent ?? null,
        regularMarketPreviousClose: yfQuote.regularMarketPreviousClose ?? null,
        marketState: yfQuote.marketState ?? null // <-- ADD THIS FIELD
    };
};

const mapYahooHistorical = (point) => ({
    date: point.date,
    close: point.close,
});

const mapYahooSearch = (q) => ({
    symbol: q.symbol,
    name: q.shortname || q.longname || null,
    // v3 compatibility for your frontend
    shortname: q.shortname || q.longname || null,
    longname: q.longname || q.shortname || null,
});

// --- Exported Provider Functions (Updated for v3) ---

const getQuote = async (tickers) => {
    const yahoo = await getYahooInstance(); // 1. Get v3 instance
    try {
        // 2. Call v3 method
        const result = await yahoo.quote(tickers);

        // 3. Map the result(s)
        if (Array.isArray(result)) {
            return result.map(mapYahooQuote).filter(q => q !== null);
        } else if (result) {
            return mapYahooQuote(result);
        }
        return Array.isArray(tickers) ? [] : null;
    } catch (error) {
        console.error(`YahooProvider (getQuote for ${tickers}): Error. ${error.message}`);
        throw error;
    }
};

const getHistorical = async (ticker, queryOptions) => {
    const yahoo = await getYahooInstance(); // 1. Get v3 instance
    try {
        // 2. Call v3 method
        const results = await yahoo.historical(ticker, queryOptions);
        // 3. Map
        return results.map(mapYahooHistorical);
    } catch (error) {
        console.error(`YahooProvider (getHistorical for ${ticker}): Error. ${error.message}`);
        throw error;
    }
};

const search = async (keyword) => {
    const yahoo = await getYahooInstance(); // 1. Get v3 instance
    try {
        // 2. Call v3 method
        const results = await yahoo.search(keyword);
        // 3. Map
        return (results.quotes || []).map(mapYahooSearch);
    } catch (error) {
        console.error(`YahooProvider (search for ${keyword}): Error. ${error.message}`);
        throw error;
    }
};

module.exports = {
    getQuote,
    getHistorical,
    search,
};