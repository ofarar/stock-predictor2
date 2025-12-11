const { default: YahooFinance } = require('yahoo-finance2'); // CommonJS require if possible, checking environment.
// Actually, since server is CommonJS (require), I should use require('yahoo-finance2').default if it works?
// My debug script used import().
// Let's stick to the method that worked in the debug script (using dynamic import to be safe in CJS environment if package is ESM).

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.error("Usage: node fetch_stock_history.js <ticker> <startDate> <endDate>");
        process.exit(1);
    }

    const ticker = args[0];
    const startDate = args[1];
    const endDate = args[2];
    const interval = args[3] || '1d';

    try {
        const { default: YahooFinance } = await import('yahoo-finance2');
        const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

        const queryOptions = {
            period1: startDate, // yahoo-finance2 handles YYYY-MM-DD strings well often, but for intraday let's be strict? 
            // Actually, let's try just passing them as is first but realize the previous error was "InvalidOptionsError".
            // Maybe it's the interval validation.
            // Let's force dates to be dates.
            period1: new Date(startDate),
            period2: new Date(endDate),
            interval: interval // '1h' or '60m'
        };

        // console.error("Query Options:", JSON.stringify(queryOptions)); // Debug log to stderr

        const result = await yahooFinance.historical(ticker, queryOptions);
        console.log(JSON.stringify(result));
    } catch (error) {
        // console.error("Yahoo Error:", error);
        console.log(JSON.stringify({ error: error.message, details: error }));
    }
}

main();
