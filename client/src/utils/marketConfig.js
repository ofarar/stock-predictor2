// src/utils/marketConfig.js

export const EXCHANGES = {
    US: {
        timezone: 'America/New_York',
        open: { hour: 9, minute: 30 },
        close: { hour: 16, minute: 0 },
        name: 'US Market (NYSE/NASDAQ)'
    },
    DE: { // Germany (XETRA)
        timezone: 'Europe/Berlin',
        open: { hour: 9, minute: 0 },
        close: { hour: 17, minute: 30 },
        name: 'Deutsche Börse (XETRA)'
    },
    UK: { // London (LSE)
        timezone: 'Europe/London',
        open: { hour: 8, minute: 0 },
        close: { hour: 16, minute: 30 },
        name: 'London Stock Exchange'
    },
    TR: { // Turkey (BIST)
        timezone: 'Europe/Istanbul',
        open: { hour: 10, minute: 0 },
        close: { hour: 18, minute: 0 },
        name: 'Borsa Istanbul (BIST)'
    },
    CRYPTO: {
        timezone: 'UTC', // Crypto is 24/7 UTC
        open: { hour: 0, minute: 0 },
        close: { hour: 23, minute: 59 },
        is247: true,
        name: 'Cryptocurrency'
    },
    FOREX: {
        timezone: 'America/New_York',
        open: { hour: 17, minute: 0 }, // Opens Sunday 5PM EST
        close: { hour: 17, minute: 0 }, // Closes Friday 5PM EST
        is245: true,
        name: 'Forex'
    }
};

/**
 * Determines the exchange configuration based on the ticker symbol.
 * @param {string} ticker - The stock symbol (e.g., 'AAPL', 'SIE.DE', 'THYAO.IS')
 */
export const getExchangeConfig = (ticker) => {
    if (!ticker) return EXCHANGES.US; // Default to US

    const upperTicker = ticker.toUpperCase();

    // Crypto detection
    if (upperTicker.includes('-USD') || upperTicker.endsWith('BTC') || upperTicker.endsWith('ETH')) {
        return EXCHANGES.CRYPTO;
    }
    
    // Forex detection
    if (upperTicker.includes('=X') || upperTicker === 'GC=F') { 
        return EXCHANGES.FOREX;
    }

    // International Suffixes
    if (upperTicker.endsWith('.DE')) return EXCHANGES.DE; // Germany
    if (upperTicker.endsWith('.L')) return EXCHANGES.UK;  // London
    if (upperTicker.endsWith('.IS')) return EXCHANGES.TR; // Turkey (Istanbul)
    if (upperTicker.endsWith('.PA')) return EXCHANGES.DE; // Paris (uses CET like Germany)
    if (upperTicker.endsWith('.AS')) return EXCHANGES.DE; // Amsterdam (uses CET)

    // Default to US
    return EXCHANGES.US;
};