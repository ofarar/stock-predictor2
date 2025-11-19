const express = require('express');
const router = express.Router();
const financeAPI = require('../services/financeAPI');
const Prediction = require('../models/Prediction');

// Caches
const searchCache = new Map();
const apiCache = new Map();

// Helper function for famous stocks
const getSentimentForTicker = async (ticker) => {
    try {
        let currentPrice = 0; // Default to 0
        try {
            const quote = await financeAPI.getQuote(ticker);
            if (quote) {
                currentPrice = quote.price;
            }
        } catch (quoteError) {
            console.warn(`(FamousStocks) Non-critical: Failed to get quote for ${ticker}: ${quoteError.message}`);
        }

        const sentiments = await Prediction.aggregate([
            { $match: { stockTicker: ticker, status: 'Active', deadline: { $gt: new Date() } } },
            {
                $group: {
                    _id: "$predictionType",
                    avgTargetPrice: { $avg: "$targetPrice" },
                    count: { $sum: 1 }
                }
            },
            { $project: { _id: 0, type: "$_id", avgTargetPrice: "$avgTargetPrice", count: 1 } },
            { $sort: { count: -1 } } // Sort by most popular
        ]);

        // Find the most relevant sentiment (Daily or Weekly)
        const daily = sentiments.find(s => s.type === 'Daily');
        const weekly = sentiments.find(s => s.type === 'Weekly');

        let relevantSentiment = [];
        if (daily) {
            relevantSentiment.push(daily);
        } else if (weekly) {
            relevantSentiment.push(weekly);
        }

        // Round the numbers in JavaScript before returning
        const processedSentiments = relevantSentiment.map(s => ({
            ...s,
            avgTargetPrice: s.avgTargetPrice ? parseFloat(s.avgTargetPrice.toFixed(2)) : 0
        }));

        return {
            currentPrice: currentPrice,
            sentiments: processedSentiments
        };
    } catch (err) {
        console.error(`Error in getSentimentForTicker for ${ticker}:`, err);
        return { currentPrice: 0, sentiments: [] };
    }
};

// GET: Search stock symbols
router.get('/search/:keyword', async (req, res) => {
    const keyword = req.params.keyword.toLowerCase();

    // 1. Check the cache first
    if (searchCache.has(keyword)) {
        const cacheEntry = searchCache.get(keyword);
        if (Date.now() - cacheEntry.timestamp < 3600000) { // 1 hour cache
            console.log(`Serving search for "${keyword}" from cache.`);
            return res.json(cacheEntry.data);
        }
    }

    console.log(`Fetching search for "${keyword}" via Adapter.`);
    try {
        // 2. Call the adapter to get standardized results
        const adapterResults = await financeAPI.search(keyword); // Returns [{ symbol, name }, ...]

        // 3. Map the adapter results BACK to the format the frontend expects
        const frontendCompatibleData = {
            quotes: adapterResults.map(r => ({
                symbol: r.symbol,
                shortname: r.name,
                longname: r.name,
            }))
        };

        // 4. Cache the frontend-compatible data
        const cacheEntry = { data: frontendCompatibleData, timestamp: Date.now() };
        searchCache.set(keyword, cacheEntry);

        // 5. Send the frontend-compatible data
        res.json(frontendCompatibleData);

    } catch (error) {
        console.error(`CRITICAL Search API Error for "${keyword}":`, error);
        res.json({ quotes: [] });
    }
});

// GET: Single stock quote
router.get('/quote/:symbol', async (req, res) => {
    const symbol = req.params.symbol;
    try {
        const quote = await financeAPI.getQuote(symbol);
        const displayPrice = quote.regularMarketPrice || quote.marketPrice || quote.regularMarketPreviousClose || null;
        res.json({ ...quote, displayPrice });
    } catch (error) {
        console.error(`Quote API: Non-critical error for ${symbol}. Error: ${error.message}`);
        res.json(null);
    }
});

// POST: Multiple stock quotes
router.post('/quotes', async (req, res) => {
    const { tickers } = req.body;
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
        return res.status(400).json({ message: 'An array of tickers is required.' });
    }

    const quotePromises = tickers.map(async (ticker) => {
        try {
            return await financeAPI.getQuote(ticker);
        } catch (err) {
            console.error(`Multi-quote: Failed to fetch quote for ${ticker}. Error: ${err.message}`);
            return null;
        }
    });

    const quotes = (await Promise.all(quotePromises)).filter(q => q !== null);
    res.json(quotes);
});

// GET: Historical data
router.get('/stock/:ticker/historical', async (req, res) => {
    const { ticker } = req.params;
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90); // Get data for the last 90 days
        const endDate = new Date(); // Today

        const period1String = startDate.toISOString().split('T')[0];
        const period2String = endDate.toISOString().split('T')[0];

        const result = await financeAPI.getHistorical(ticker, {
            period1: period1String,
            period2: period2String,
        });

        res.json(result);
    } catch (error) {
        console.error(`Finance API historical error for ${ticker}:`, error.message);
        res.status(500).json({ message: "Error fetching historical data" });
    }
});

// GET: Stock details (quote only)
router.get('/stock/:ticker', async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    try {
        let quote = null;
        try {
            quote = await financeAPI.getQuote(ticker);
        } catch (financeApiError) {
            console.error(`StockPage: Non-critical error fetching quote for ${ticker}. Error: ${financeApiError.message}`);
        }
        res.json({ quote });
    } catch (dbError) {
        console.error(`Error fetching data for stock ${ticker}:`, dbError);
        res.status(500).json({ message: "Failed to fetch stock data" });
    }
});

// server/routes/market.js (inside the router.get('/community-sentiment/:ticker', ...))

router.get('/community-sentiment/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        const upperTicker = ticker.toUpperCase();

        let currentPrice = 0;
        try {
            const quote = await financeAPI.getQuote(upperTicker);
            if (quote) {
                currentPrice = quote.price;
            }
        } catch (quoteError) {
            console.warn(`(Sentiment) Non-critical: Failed to get quote for ${upperTicker}: ${quoteError.message}`);
        }

        const sentiments = await Prediction.aggregate([
            {
                $match: {
                    stockTicker: upperTicker,
                    status: 'Active',
                    deadline: { $gt: new Date() }
                }
            },
            {
                $group: {
                    _id: "$predictionType",
                    avgTargetPrice: { $avg: "$targetPrice" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    type: "$_id",
                    avgTargetPrice: "$avgTargetPrice",
                    count: 1
                }
            },
            { $sort: { count: -1 } }
        ]);

        // --- FIX: CONVERT ARRAY TO MAP AND RETURN ---
        const sentimentMap = sentiments.reduce((acc, s) => {
            acc[s.type] = {
                averageTarget: s.avgTargetPrice ? parseFloat(s.avgTargetPrice.toFixed(2)) : 0,
                predictionCount: s.count
            };
            return acc;
        }, {});

        // Return the map directly. The frontend uses the map keys and the currentPrice prop.
        res.json(sentimentMap);
        // ---------------------------------------------

    } catch (err) {
        console.error(`Error fetching community sentiment for ${req.params.ticker}:`, err);
        res.status(500).json({ message: "Failed to fetch community sentiment." });
    }
});

// GET: Top movers widget
router.get('/market/top-movers', async (req, res) => {
    const cacheKey = 'top-movers';
    if (apiCache.has(cacheKey) && (Date.now() - apiCache.get(cacheKey).timestamp < 15 * 60 * 1000)) {
        return res.json(apiCache.get(cacheKey).data);
    }

    try {
        const trending = await financeAPI.getTrendingSymbols('US', { count: 6 });
        const tickers = trending.quotes.map(q => q.symbol);
        const quotes = await financeAPI.getQuote(tickers);

        const movers = quotes.map(q => ({
            ticker: q.symbol,
            price: q.regularMarketPrice?.toFixed(2) || 'N/A',
            change: q.regularMarketChange?.toFixed(2) || 'N/A',
            percentChange: q.regularMarketChangePercent?.toFixed(2) || 'N/A',
            isUp: (q.regularMarketChange || 0) >= 0
        }));

        apiCache.set(cacheKey, { data: movers, timestamp: Date.now() });
        res.json(movers);
    } catch (err) {
        console.error("Top movers fetch error:", err);
        res.status(500).json({ message: "Failed to fetch market data." });
    }
});

// GET: Famous stocks widget
router.get('/widgets/famous-stocks', async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);

        let stocks = await Prediction.aggregate([
            { $match: { createdAt: { $gte: startOfDay } } },
            { $group: { _id: '$stockTicker', predictions: { $sum: 1 } } },
            { $sort: { predictions: -1 } },
            { $limit: 4 },
            { $project: { ticker: '$_id', predictions: 1, _id: 0 } }
        ]);

        let isHistorical = false;

        if (stocks.length === 0) {
            isHistorical = true;
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
            sevenDaysAgo.setUTCHours(0, 0, 0, 0);

            stocks = await Prediction.aggregate([
                { $match: { createdAt: { $gte: sevenDaysAgo } } },
                { $group: { _id: '$stockTicker', predictions: { $sum: 1 } } },
                { $sort: { predictions: -1 } },
                { $limit: 4 },
                { $project: { ticker: '$_id', predictions: 1, _id: 0 } }
            ]);
        }

        if (stocks.length > 0) {
            const tickers = stocks.map(s => s.ticker);
            try {
                const [quotes, sentimentsResults] = await Promise.all([
                    financeAPI.getQuote(tickers).catch(e => {
                        console.error("Finance API error in famous-stocks (quotes):", e.message);
                        return [];
                    }),
                    Promise.all(tickers.map(ticker =>
                        Prediction.aggregate([
                            { $match: { stockTicker: ticker, status: 'Active', deadline: { $gt: new Date() } } },
                            { $group: { _id: "$predictionType", avgTargetPrice: { $avg: "$targetPrice" }, count: { $sum: 1 } } },
                            { $project: { _id: 0, type: "$_id", avgTargetPrice: "$avgTargetPrice", count: 1 } }
                        ]).catch(e => {
                            console.error(`Sentiment aggregation error for ${ticker}:`, e.message);
                            return [];
                        })
                    ))
                ]);

                const quoteMap = new Map();
                if (quotes && Array.isArray(quotes)) {
                    quotes.forEach(q => { if (q) quoteMap.set(q.symbol, q); });
                }

                const sentimentMap = new Map();
                if (sentimentsResults && Array.isArray(sentimentsResults)) {
                    sentimentsResults.forEach((sentimentsArray, index) => {
                        const ticker = tickers[index];
                        if (sentimentsArray && sentimentsArray.length > 0) {
                            const mappedSentiment = {};
                            sentimentsArray.forEach(sent => {
                                mappedSentiment[sent.type] = {
                                    averageTarget: sent.avgTargetPrice,
                                    predictionCount: sent.count
                                };
                            });
                            sentimentMap.set(ticker, mappedSentiment);
                        }
                    });
                }

                stocks = stocks.map(stock => ({
                    ...stock,
                    quote: quoteMap.get(stock.ticker) || null,
                    sentiment: sentimentMap.get(stock.ticker) || null
                }));

            } catch (enrichError) {
                console.error("Failed to enrich famous stocks data:", enrichError.message);
                stocks.forEach(s => {
                    s.quote = null;
                    s.sentiment = null;
                });
            }
        }

        res.json({ stocks, isHistorical });

    } catch (err) {
        console.error("Error fetching famous stocks:", err);
        res.json({ stocks: [], isHistorical: false });
    }
});

// GET: Key assets widget
router.get('/market/key-assets', async (req, res) => {
    const fixedTickers = [
        { ticker: 'GC=F', name: 'Gold' },
        { ticker: 'BTC-USD', name: 'Bitcoin' },
        { ticker: 'ETH-USD', name: 'Ethereum' },
        { ticker: 'EURUSD=X', name: 'EUR/USD' },
    ];
    const magSevenTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'];
    const allTickers = [...fixedTickers.map(t => t.ticker), ...magSevenTickers];

    try {
        // Use the adapter to fetch all quotes
        const quotes = await financeAPI.getQuote(allTickers); // returns StandardQuote[] or []

        // If quotes array is empty due to API failure, return empty response
        if (quotes.length === 0) {
            console.warn("Market Assets: getQuote returned empty array, likely API issue.");
            return res.json([]);
        }

        // Separate the Magnificent Seven quotes
        const magSevenQuotes = quotes.filter(q => magSevenTickers.includes(q.symbol));

        // Find top 2 movers using standardized field names
        const topTwoMovers = magSevenQuotes
            .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0)) // Use standardized changePercent
            .slice(0, 2);

        // Combine fixed list with top movers
        const finalTickers = [
            ...fixedTickers.map(t => t.ticker),
            ...topTwoMovers.map(t => t.symbol)
        ];

        // Format the final list using standardized fields
        const assets = finalTickers.map(ticker => {
            const quote = quotes.find(q => q.symbol === ticker);
            if (!quote) return null; // Handle case where a quote might be missing

            const name = fixedTickers.find(t => t.ticker === ticker)?.name || quote.name || quote.symbol;

            return {
                ticker: quote.symbol,
                name: name,
                price: quote.price, // Use standardized price
                currency: quote.currency, // Use standardized currency
                percentChange: quote.changePercent, // Use standardized changePercent
                isUp: (quote.changeAbsolute ?? 0) >= 0 // Use standardized changeAbsolute
            };
        }).filter(a => a !== null); // Filter out any missing quotes

        res.json(assets);
    } catch (err) {
        console.error("Key assets fetch error:", err.message);
        res.json([]); // Send empty array on any unexpected error
    }
});

module.exports = router;
