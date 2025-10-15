// server/models/Notification.js

// FIX: Changed from 'import mongoose from 'mongoose';'
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['NewPrediction', 'NewFollower', 'BadgeEarned', 'GoldenPost'], required: true },
    messageKey: { type: String, required: true },
    metadata: { type: Object },
    read: { type: Boolean, default: false },
    link: { type: String },
    createdAt: { type: Date, default: Date.now }
});

// FIX: Changed from 'export default mongoose.model(...);'
module.exports = mongoose.model('Notification', NotificationSchema);