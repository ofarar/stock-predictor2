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
    goldenMemberPrice: { type: Number, default: 5 },
    goldenMemberDescription: { type: String, maxLength: 300 },
    // --- New Subscription Fields ---
    goldenSubscribers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // People who joined me
    goldenSubscriptions: [{ type: Schema.Types.ObjectId, ref: 'User' }] // Golden members I joined
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);