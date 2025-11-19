// instrument.js
require('dotenv').config(); // Load env vars first so DSN is available
const Sentry = require("@sentry/node");

// Ensure to call this before requiring any other modules!
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

module.exports = Sentry;