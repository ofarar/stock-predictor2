// server/models/Post.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    message: {
        type: String,
        required: true,
        maxLength: 2000
    },
    attachedPrediction: {
        stockTicker: { type: String, uppercase: true },
        targetPrice: { type: Number },
        priceAtCreation: { type: Number },
        predictionType: { type: String, enum: ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'] },
        deadline: { type: Date },
    },
    isGoldenPost: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);