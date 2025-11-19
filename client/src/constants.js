export const API_URL = import.meta.env.VITE_API_URL;

export const API_ENDPOINTS = {
    CURRENT_USER: '/auth/current_user',
    SETTINGS: '/api/settings',
    PROFILE: (userId) => `/api/profile/${userId}`,
    USER_VIEW: (userId) => `/api/users/${userId}/view`,
    QUOTES: '/api/quotes',
    FOLLOW: (userId) => `/api/users/${userId}/follow`,
    UNFOLLOW: (userId) => `/api/users/${userId}/unfollow`,
    CANCEL_VERIFICATION: '/api/profile/cancel-verification',

    // --- NEWLY ADDED ENDPOINTS ---
    SHARE_ACTIVITY: '/api/activity/share',
};

export const STORAGE_KEYS = {
    REFERRAL_CODE: 'referralCode',
    VIEWED_PROFILES: 'viewed_profiles',
    VIEWED_PREDICTIONS: 'viewed_predictions',
};

export const COOKIE_NAMES = {
    CONSENT: 'stockpredictor-cookie-consent',
};

export const URL_PARAMS = {
    REF: 'ref',
    SUBSCRIBE: 'subscribe',
    ONBOARDING: 'onboarding',
    TAB: 'tab',
};

export const PARAM_VALUES = {
    SUCCESS: 'success',
    COMPLETE: 'complete',
    REFRESH: 'refresh',
    GOLDEN_FEED: 'GoldenFeed',
    PROFILE: 'Profile',
};

export const ROUTES = {
    HOME: '/',
    DASHBOARD: '/dashboard',
    COMPLETE_PROFILE: '/complete-profile',
    EXPLORE: '/explore',
    SCOREBOARD: '/scoreboard',
    PROFILE: '/profile/:userId',
    FOLLOWERS: '/profile/:userId/followers',
    EDIT_PROFILE: '/profile/edit',
    STOCK: '/stock/:ticker',
    LOGIN: '/login',
    ABOUT: '/about',
    TERMS: '/terms',
    PRIVACY: '/privacy',
    ADMIN: '/admin',
    PREDICTION_DETAIL: '/prediction/:predictionId',
    GOLDEN_FEED: '/golden-feed',
    CONTACT: '/contact',
    WATCHLIST: '/watchlist',
    NOTIFICATIONS: '/settings/notifications',
    PAYMENT_SUCCESS: '/payment-success',
    AI_WIZARD: '/ai-wizard',
};

export const PREDICTION_STATUS = {
    ACTIVE: 'Active',
    ASSESSED: 'Assessed',
};

export const DEFAULT_VALUES = {
    VERIFICATION_PRICE: '4.99',
};

export const NUMERIC_CONSTANTS = {
    // Time/Duration (milliseconds)
    ONE_HOUR_MS: 60 * 60 * 1000,
    QUOTE_REFRESH_INTERVAL_MS: 60000, // 1 minute
    SEARCH_DEBOUNCE_MS: 500,
    VERIFICATION_ANIMATION_DURATION_MS: 2400,

    // Limits
    ABOUT_CHAR_LIMIT: 300,
    RATIONALE_CHAR_LIMIT: 500,
    PREDICTIONS_PER_LOAD: 6, // Used in PredictionList.jsx
};

export const THRESHOLDS = {
    // 1. Prediction % change required to trigger the Confirmation Modal
    CONFIRMATION_HOURLY: 3,
    CONFIRMATION_DAILY: 10,
    CONFIRMATION_WEEKLY: 15,
    CONFIRMATION_MONTHLY: 20,
    CONFIRMATION_QUARTERLY: 40,
    CONFIRMATION_YEARLY: 100,

    // 2. Aggressiveness Score Thresholds (used in ProfilePage/Aggressiveness)
    // { defensive max %, neutral max % }
    AGRESSIVENESS_HOURLY: { def: 1, neu: 3 },
    AGRESSIVENESS_DAILY: { def: 3, neu: 7 },
    AGRESSIVENESS_WEEKLY: { def: 5, neu: 10 },
    AGRESSIVENESS_MONTHLY: { def: 8, neu: 20 },
    AGRESSIVENESS_QUARTERLY: { def: 10, neu: 25 },
    AGRESSIVENESS_YEARLY: { def: 15, neu: 35 },

    // 3. Time Penalty Constants (Used in timeHelpers.js)
    TIME_PENALTY_HOURLY_START_MIN: 10, // Penalty starts after this many minutes
    TIME_PENALTY_HOURLY_MAX_LOSS: 20,  // Max penalty loss for Hourly (20 points max loss)
    TIME_PENALTY_WEEKLY_MAX_LOSS: 20,
    TIME_PENALTY_MONTHLY_MAX_LOSS: 25,
    TIME_PENALTY_QUARTERLY_MAX_LOSS: 25,
    TIME_PENALTY_YEARLY_MAX_LOSS: 30,
};

export const DOMAIN_STRINGS = {
    // Strings used in the share breakdown logic for context filtering
    SHARE_CONTEXT_PREDICTION: 'prediction',
    SHARE_CONTEXT_BADGE: 'badge',
    SHARE_CONTEXT_RANK: 'rank',
    SHARE_CONTEXT_OTHER: 'Other',
};
