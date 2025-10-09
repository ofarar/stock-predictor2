const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['NewPrediction', 'NewFollower', 'BadgeEarned'], required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    link: { type: String }, // e.g., /stock/TSLA
    metadata: { type: Object }, // <-- ADD THIS FIELD for extra data
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);