// server/services/financeProviders/nasdaqEarningProvider.js

const axios = require('axios');
// Assumes constants.js exists in the parent directory of 'financeProviders'
const { MARKET_CAP_THRESHOLD } = require('../../constants');

/**
 * Fetches earnings data from NASDAQ API for the next 7 days, 
 * filters by Market Cap, and maps the result.
 * @returns {Promise<Array>} List of upcoming earnings events in simplified format.
 */
const fetchCalendar = async () => {
    console.log("NASDAQ Provider: Starting fetch for earnings calendar...");
    const allEarnings = [];
    const today = new Date();

    // Loop for the next 7 days (including today)
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

        try {
            const url = `https://api.nasdaq.com/api/calendar/earnings?date=${dateString}`;
            const response = await axios.get(url, {
                headers: {
                    // Necessary headers to bypass basic detection
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Referer': 'https://www.nasdaq.com/'
                },
                timeout: 5000
            });

            if (response.data && response.data.data && response.data.data.rows) {
                const rows = response.data.data.rows;

                const dailyEarnings = rows.filter(row => {
                    // Filter Logic: Check Market Cap
                    if (!row.marketCap || row.marketCap === 'N/A') return false;
                    const marketCapStr = row.marketCap.replace(/[$,]/g, '');
                    const marketCap = parseFloat(marketCapStr);
                    return marketCap >= MARKET_CAP_THRESHOLD;
                }).map(row => ({
                    // Map to simplified result structure
                    ticker: row.symbol,
                    earningsDate: dateString,
                    time: row.time === 'time-not-supplied' ? 'N/A' : row.time,
                    name: row.name,
                    epsForecast: row.epsForecast
                }));

                allEarnings.push(...dailyEarnings);
            }

            // Rate limit self to be nice to the API
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error(`NASDAQ Provider: Failed to fetch earnings for ${dateString}:`, error.message);
            // Continue to next day even if one fails
        }
    }

    console.log(`NASDAQ Provider: Fetched ${allEarnings.length} earnings events.`);
    return allEarnings;
};

module.exports = {
    fetchCalendar,
};