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
const mapCoinGeckoQuote = (symbol, price) => {
    // Note: CoinGecko's simple API only returns the spot price, so change fields are null.
    return {
        symbol: symbol,
        name: symbol.replace('-USD', ''),
        price: price,
        changeAbsolute: null,
        changePercent: null,
        currency: 'USD',
        regularMarketPrice: price,
        marketState: 'REGULAR',
        exchangeTimezoneName: 'UTC'
    };
};

/**
 * Fetches the current spot price for a crypto ticker.
 * Handles single tickers only, as CoinGecko's batch endpoint uses different parameters.
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
                vs_currencies: 'usd'
            },
            timeout: 5000 // Set a timeout to prevent hanging
        });

        const priceData = response.data[cgId];

        if (priceData && priceData.usd) {
            return mapCoinGeckoQuote(ticker, priceData.usd);
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