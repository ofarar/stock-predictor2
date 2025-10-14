#!/usr/bin/env node
import yahooFinance from 'yahoo-finance2';

// Get symbol from command line
const symbol = process.argv[2];

if (!symbol) {
  console.error('Usage: node checkMarket.js SYMBOL');
  process.exit(1);
}

/**
 * Check market state for a given symbol
 * @param {string} symbol
 * @returns {Promise<string>} - PRE, REGULAR, POST, CLOSED
 */
async function getMarketState(symbol) {
  try {
    const quote = await yahooFinance.quote(symbol);
    return quote.marketState || 'UNKNOWN';
  } catch (err) {
    console.error(`Error fetching quote for ${symbol}:`, err.message);
    return 'ERROR';
  }
}

// Run
(async () => {
  const state = await getMarketState(symbol);
  console.log(`${symbol} market state: ${state}`);
})();
