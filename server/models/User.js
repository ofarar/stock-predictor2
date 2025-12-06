// server/models/User.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    googleId: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    avatar: { type: String },
    about: { type: String, maxLength: 500 },
    youtubeLink: { type: String },
    xLink: { type: String },
    telegramLink: { type: String },
    isAdmin: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    // --- STRIPE FIELDS ---
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    stripeSubscriptionStatus: { type: String, enum: ['active', 'canceled', 'incomplete', 'past_due', null], default: null },
    // This stores the date when the subscription will officially end after a cancellation.
    stripeSubscriptionEndDate: { type: Date },
    // --- STRIPE CONNECT (FOR GOLDEN MEMBERS) FIELDS ---
    stripeConnectAccountId: { type: String, index: true }, // ID of their Express account
    stripeConnectOnboardingComplete: { type: Boolean, default: false }, // Has Stripe onboarding finished?
    goldenMemberPriceId: { type: String }, // Stripe Price ID specific to this member
    // --- NEW: STRIPE RESTRICTIONS FIELDS ---
    stripeConnectRestrictions: { type: Boolean, default: false }, // Indicates a restriction is active
    stripeConnectPendingFields: { type: [String], default: [] },  // List of fields required by Stripe (e.g., ['verification.document'])
    // --- END NEW ---
    // --- END STRIPE FIELDS ---
    totalRating: { type: Number, default: 0, index: true },
    analystRating: {
        total: { type: Number, default: 0, index: true },
        fromPredictions: { type: Number, default: 0 },
        fromBadges: { type: Number, default: 0 },
        fromShares: { type: Number, default: 0 },
        fromReferrals: { type: Number, default: 0 }, // For your new feature
        fromRanks: { type: Number, default: 0 },
        fromBonus: { type: Number, default: 0 },     // For your new feature
        shareBreakdown: { type: Map, of: Number, default: {} },
        predictionBreakdownByStock: { type: Map, of: Number, default: {} }, // <-- NEW
        badgeBreakdown: { type: Map, of: Number, default: {} },             // <-- NEW
        rankBreakdown: { type: Map, of: Number, default: {} }
    },
    avgRating: { type: Number, default: 0, index: true }, // Stores the user's 0-100 average prediction rating
    language: { type: String, default: 'en' },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    referrals: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    // --- START: NEW FIELDS ---
    //watchlistTicker: { type: String, uppercase: true, default: null },
    watchlist: [{ type: String, uppercase: true }],
    notificationSettings: {
        // existing advanced filters for predictions
        allFollowedPredictions: { type: Boolean, default: false },
        trustedShortTerm: { type: Boolean, default: true },
        trustedLongTerm: { type: Boolean, default: true },

        // New Granular Toggles (Default True)
        newPrediction: { type: Boolean, default: true },
        newFollower: { type: Boolean, default: true },
        badgeEarned: { type: Boolean, default: true },
        goldenPost: { type: Boolean, default: true },
        priceChange: { type: Boolean, default: true },
        predictionAssessed: { type: Boolean, default: true },
        newReferral: { type: Boolean, default: true }
    },
    // --- END: NEW FIELDS ---

    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isGoldenMember: { type: Boolean, default: false },
    goldenMemberPrice: {
        type: Number,
        default: 5,
        min: 1,
        max: 500
    },
    goldenMemberDescription: { type: String, maxLength: 300 },
    acceptingNewSubscribers: { type: Boolean, default: true },
    goldenSubscribers: [{
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        subscribedAt: { type: Date, default: Date.now }
    }],
    goldenSubscriptions: [{
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        subscribedAt: { type: Date, default: Date.now }
    }],
    badges: [{
        badgeId: { type: String, required: true },
        tier: { type: String, enum: ['Bronze', 'Silver', 'Gold'], required: true },
        achievedAt: { type: Date, default: Date.now }
    }],
    lastCheckedGoldenFeed: { type: Date, default: Date.now },
    dailyPredictionCount: { type: Number, default: 0 },
    profileViews: { type: Number, default: 0 },
    lastPredictionDate: { type: Date },
    hasSeenCreatorPoolAnimation: { type: Boolean, default: false },
    fcmTokens: [{ type: String }], // For Push Notifications
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);