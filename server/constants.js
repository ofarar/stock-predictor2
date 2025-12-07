// server/constants.js

// --- PREDICTION SCORING ---
exports.PREDICTION_MAX_RATING = 100;
exports.PREDICTION_MAX_ERROR_PERCENTAGE = 0.20; // 20% deviation is 0 score
exports.RATING_DIRECTION_CHECK_ENABLED = true;

// --- ANALYST RATING AWARDS (Total Points) ---
exports.RATING_AWARDS = {
    // Core Incentives
    EARLY_USER_BONUS: 1000,
    REFERRAL_SUCCESS: 500,
    SHARE_ACTIVITY: 5,

    // Prediction Accuracy Tiers
    ACCURACY_TIER_90: 10, // Awarded for rating > 90
    ACCURACY_TIER_80: 5,  // Awarded for rating > 80
    ACCURACY_TIER_70: 2,  // Awarded for rating > 70

    // Bug Bounty Tiers (For Admin award)
    BUG_BOUNTY_CRITICAL: 500,
    BUG_BOUNTY_NORMAL: 100,
    BUG_BOUNTY_MINOR: 25,

    BASE_TARGET_HIT_BONUS: 5, // Base points awarded for hitting the target
};

exports.TARGET_HIT_WEIGHTS = {
    Hourly: 0.5,     // Low reward: 5 * 0.5 = 2.5 points
    Daily: 1.0,      // Base reward: 5 * 1.0 = 5.0 points
    Weekly: 2.0,     // Increased reward for medium-term accuracy
    Monthly: 4.0,
    Quarterly: 6.0,
    Yearly: 10.0,    // Highest reward multiplier for long-term forecast
};

// --- BADGE RATING AWARDS (Used in badgeService.js) ---
exports.BADGE_POINTS = {
    GOLD: 500,
    SILVER: 250,
    BRONZE: 100,
};

// --- RANKING AWARDS (Used in rankService.js) ---
exports.RANK_BONUS = {
    RANK_1: 100,
    RANK_TOP_10: 50,
    RANK_TOP_50: 10,
    RANK_TOP_100: 5,
};
exports.RANK_WEIGHTS = {
    HIGH_COMPETITION: 1.5, // >100 competitors
    MEDIUM_COMPETITION: 1.0, // >20 competitors
    LOW_COMPETITION: 0.5, // <20 competitors
    HIGH_COMPETITION_THRESHOLD: 100,
    MEDIUM_COMPETITION_THRESHOLD: 20,
};

// --- NOTIFICATION & TIME CONSTANTS (used in predictions.js/timeHelpers) ---
exports.NOTIFICATION_THRESHOLD_PERCENTAGES = {
    Hourly: 3,
    Daily: 10,
    Weekly: 15,
    Monthly: 20,
    Quarterly: 40,
    Yearly: 100,
};
exports.SHORT_TERM_PREDICTION_TYPES = ['Hourly', 'Daily', 'Weekly'];

// --- RATE LIMITING (NEWLY ADDED) ---
// Prediction creation limit (10 requests per hour)
exports.PREDICT_LIMIT = 10;
exports.PREDICT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Social actions limit (60 requests per 15 minutes)
exports.ACTION_LIMIT = 60;
exports.ACTION_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// View/read actions limit (30 requests per hour)
exports.VIEW_LIMIT = 30;
exports.VIEW_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Contact form limit (5 requests per hour)
exports.CONTACT_LIMIT = 5;
exports.CONTACT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// --- FINANCE API CONSTANTS ---
exports.MARKET_CAP_THRESHOLD = 100_000_000_000; // $100 Billion