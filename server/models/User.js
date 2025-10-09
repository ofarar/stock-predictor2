// server/models/User.js

// FIX: Changed from 'import' syntax
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
    score: { type: Number, default: 0, index: true },
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isGoldenMember: { type: Boolean, default: false },
    goldenMemberPrice: {
        type: Number,
        default: 5,
        min: 1,   // ADD: Minimum price
        max: 500  // ADD: Maximum price
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
    }]
}, { timestamps: true });

// FIX: Changed from 'export default' syntax
module.exports = mongoose.model('User', UserSchema);