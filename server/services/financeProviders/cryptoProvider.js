const axios = require('axios');

const BASE_URL = 'https://api.coingecko.com/api/v3/simple/price';

// Map your app's tickers (BTC-USD) to CoinGecko's internal IDs (bitcoin)
const TICKER_MAP = {
    'BTC-USD': 'bitcoin',
    'ETH-USD': 'ethereum',
};

/**
 * Maps a single CoinGecko response to the application's StandardQuote format.
 */
const mapCoinGeckoQuote = (symbol, priceData) => {
    const price = priceData.usd;
    // CoinGecko returns the change as a percentage (e.g., 1.5 for 1.5%)
    const changePercent = priceData.usd_24h_change;
    let changeAbsolute = null;

    // Calculate Absolute Change if percentage is available
    if (changePercent !== undefined && price !== undefined) {
        // Calculate the price 24h ago: Price_old = Price_current / (1 + (ChangePercent / 100))
        const price24hAgo = price / (1 + (changePercent / 100));
        changeAbsolute = price - price24hAgo;
    }

    // We map CoinGecko's 24h change fields to the Yahoo-standard `regularMarketChange*` fields.
    return {
        symbol: symbol,
        name: symbol.replace('-USD', ''),
        price: price,
        // --- ADDED 24h CHANGE FIELDS (Required by StandardQuote) ---
        changeAbsolute: changeAbsolute,
        changePercent: changePercent,
        // Map to Yahoo standard fields for frontend compatibility
        regularMarketChange: changeAbsolute,
        regularMarketChangePercent: changePercent,
        // -----------------------------------------------------------
        currency: 'USD',
        regularMarketPrice: price,
        marketState: 'REGULAR',
        exchangeTimezoneName: 'UTC'
    };
};

/**
 * Fetches the current spot price and 24h change for a crypto ticker.
 */
const getQuote = async (ticker) => {
    const cgId = TICKER_MAP[ticker];
    if (!cgId) {
        console.warn(`CryptoProvider: Ticker ${ticker} not mapped to a CoinGecko ID.`);
        throw new Error('Unmapped crypto ticker.');
    }

    try {
        const response = await axios.get(BASE_URL, {
            params: {
                ids: cgId,
                vs_currencies: 'usd',
                // --- CRITICAL ADDITION: Request 24h change data ---
                include_24hr_change: 'true',
            },
            timeout: 5000 // Set a timeout to prevent hanging
        });

        const priceData = response.data[cgId];

        if (priceData && priceData.usd) {
            // Map the full priceData object, including the new change fields
            return mapCoinGeckoQuote(ticker, priceData);
        }

        // If data is present but price is missing
        throw new Error('CoinGecko returned no price data for USD.');

    } catch (error) {
        console.error(`CryptoProvider failed for ${ticker}:`, error.message);
        throw new Error(`Failed to fetch crypto quote for ${ticker}.`);
    }
};

module.exports = {
    getQuote,
    // Note: getHistorical and search methods are not implemented here (they fall back to Yahoo)
};