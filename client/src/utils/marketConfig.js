// src/utils/marketConfig.js
// No imports are needed

export const EXCHANGES = {
    US: {
        timezone: 'America/New_York', // Handles EST/EDT (winter/summer)
        open: { hour: 9, minute: 30 },
        close: { hour: 16, minute: 0 },
        name: 'US Market (NYSE/NASDAQ)'
    },
    DE: { // Germany (XETRA)
        timezone: 'Europe/Berlin', // Handles CET/CEST
        open: { hour: 9, minute: 0 },
        close: { hour: 17, minute: 30 },
        name: 'Deutsche Börse (XETRA)'
    },
    FR: { // France (Euronext Paris)
        timezone: 'Europe/Paris', // Handles CET/CEST
        open: { hour: 9, minute: 0 },
        close: { hour: 17, minute: 30 },
        name: 'Euronext Paris'
    },
    NL: { // Netherlands (Euronext Amsterdam)
        timezone: 'Europe/Amsterdam', // Handles CET/CEST
        open: { hour: 9, minute: 0 },
        close: { hour: 17, minute: 30 },
        name: 'Euronext Amsterdam'
    },
    UK: { // London (LSE)
        timezone: 'Europe/London', // Handles GMT/BST
        open: { hour: 8, minute: 0 },
        close: { hour: 16, minute: 30 },
        name: 'London Stock Exchange'
    },
    TR: { // Turkey (BIST)
        timezone: 'Europe/Istanbul', // Always UTC+3
        open: { hour: 10, minute: 0 },
        close: { hour: 18, minute: 0 },
        name: 'Borsa Istanbul (BIST)'
    },
    JP: { // Japan (Tokyo)
        timezone: 'Asia/Tokyo', // Always UTC+9
        open: { hour: 9, minute: 0 },
        close: { hour: 15, minute: 0 },
        name: 'Tokyo Stock Exchange'
    },
    HK: { // Hong Kong (HKEX)
        timezone: 'Asia/Hong_Kong', // Always UTC+8
        open: { hour: 9, minute: 30 },
        close: { hour: 16, minute: 0 },
        name: 'Hong Kong Stock Exchange'
    },
    // Note: Shanghai (.SS) and Shenzhen (.SZ) often have different rules/data access
    // Hong Kong (.HK) is a safer bet for many major Chinese companies like Tencent (0700.HK)
    CRYPTO: {
        timezone: 'UTC',
        open: { hour: 0, minute: 0 },
        close: { hour: 23, minute: 59, second: 59 },
        is247: true,
        name: 'Cryptocurrency'
    },
    FOREX: {
        timezone: 'America/New_York', // Market "week" is based on NY time
        open: { hour: 17, minute: 0 }, // Opens Sunday 5PM
        close: { hour: 17, minute: 0 }, // Closes Friday 5PM
        is245: true,
        name: 'Forex/Commodities'
    }
};

/**
 * Determines the exchange configuration based on the ticker symbol.
 */
export const getExchangeConfig = (ticker) => {
    if (!ticker) return EXCHANGES.US; // Default to US

    const upperTicker = ticker.toUpperCase();

    // Crypto detection
    if (upperTicker.includes('-USD') || upperTicker.endsWith('BTC') || upperTicker.endsWith('ETH')) {
        return EXCHANGES.CRYPTO;
    }
    
    // Forex & Commodities detection
    if (upperTicker.includes('=X') || upperTicker.endsWith('=F')) { 
        return EXCHANGES.FOREX;
    }

    // --- UPDATED INTERNATIONAL SUFFIXES ---
    if (upperTicker.endsWith('.IS')) return EXCHANGES.TR; // Turkey
    if (upperTicker.endsWith('.DE')) return EXCHANGES.DE; // Germany
    if (upperTicker.endsWith('.L')) return EXCHANGES.UK;  // London
    if (upperTicker.endsWith('.PA')) return EXCHANGES.FR; // Paris
    if (upperTicker.endsWith('.AS')) return EXCHANGES.NL; // Amsterdam
    if (upperTicker.endsWith('.T')) return EXCHANGES.JP;  // Tokyo
    if (upperTicker.endsWith('.HK')) return EXCHANGES.HK; // Hong Kong
    // (Add .SS for Shanghai, .SZ for Shenzhen if needed)
    // --- END UPDATE ---

    // Default to US
    return EXCHANGES.US;
};