// server/services/financeProviders/yahooProvider.js

const yahooFinance = require('yahoo-finance2').default;

// --- Helper Functions (Mapping) ---

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
    };
};

const mapYahooHistorical = (point) => ({
    date: point.date,
    close: point.close,
});

const mapYahooSearch = (q) => ({
    symbol: q.symbol,
    name: q.shortname || q.longname || null,
});

// --- Exported Provider Functions ---

const getQuote = async (tickers) => {
    try {
        const result = await yahooFinance.quote(tickers);
        if (Array.isArray(result)) {
            return result.map(mapYahooQuote).filter(q => q !== null);
        } else if (result) {
            return mapYahooQuote(result);
        }
        return Array.isArray(tickers) ? [] : null;
    } catch (error) {
        // Log specific provider error
        console.error(`YahooProvider (getQuote for ${tickers}): Error. ${error.message}`);
        throw error;
    }
};

const getHistorical = async (ticker, queryOptions) => {
    try {
        const results = await yahooFinance.historical(ticker, queryOptions);
        return results.map(mapYahooHistorical);
    } catch (error) {
        console.error(`YahooProvider (getHistorical for ${ticker}): Error. ${error.message}`);
        throw error;
    }
};

const search = async (keyword) => {
    try {
        const results = await yahooFinance.search(keyword);
        return (results.quotes || []).map(mapYahooSearch);
    } catch (error) {
        console.error(`YahooProvider (search for ${keyword}): Error. ${error.message}`);
        // For search, we might still want the fallback, but let's re-throw for health check consistency
        // If you prefer the fallback for general use, you might need a specific health-check function.
        throw error; // <-- RE-THROW THE ERROR 
        /* // Or keep fallback logic if preferred, but health check will show success on API error:
         return [{
             symbol: keyword.toUpperCase(),
             name: `Add "${keyword.toUpperCase()}" manually`,
         }];
        */
    }
};

module.exports = {
    getQuote,
    getHistorical,
    search,
};