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

    try {
        const { default: YahooFinance } = await import('yahoo-finance2');
        const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

        const queryOptions = {
            period1: startDate,
            period2: endDate
        };

        const result = await yahooFinance.historical(ticker, queryOptions);

        // Output as JSON
        console.log(JSON.stringify(result));
    } catch (error) {
        // Output explicit error structure for Python to parse or handle
        console.error(JSON.stringify({ error: error.message }));
        process.exit(1);
    }
}

main();
