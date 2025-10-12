require('full-icu'); // <-- ADD THIS LINE AT THE TOP

const price = 24.50;
const locale = 'tr';
const currency = 'USD';

const formatter = new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: currency,
});

console.log(`Formatting for ${locale}:`, formatter.format(price));