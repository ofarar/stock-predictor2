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
    isAdmin: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    // --- STRIPE FIELDS ---
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    stripeSubscriptionStatus: { type: String, enum: ['active', 'canceled', 'incomplete', 'past_due', null], default: null },
    // This stores the date when the subscription will officially end after a cancellation.
    stripeSubscriptionEndDate: { type: Date },
    // --- END STRIPE FIELDS ---
    score: { type: Number, default: 0, index: true },
    language: { type: String, default: 'en' },

    // --- START: NEW FIELDS ---
    //watchlistTicker: { type: String, uppercase: true, default: null },
    watchlist: [{ type: String, uppercase: true }],
    notificationSettings: {
        allFollowedPredictions: { type: Boolean, default: false },
        trustedShortTerm: { type: Boolean, default: true },
        trustedLongTerm: { type: Boolean, default: true }
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
    dailyPredictionCount: { type: Number, default: 0 }, // <-- ADD THIS LINE
    lastPredictionDate: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);