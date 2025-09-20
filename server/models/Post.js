const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true 
    },
    // The main message/announcement content
    message: { 
        type: String, 
        required: true,
        maxLength: 2000
    },
    // Optional prediction attached to the post
    attachedPrediction: {
        stockTicker: { type: String, uppercase: true },
        targetPrice: { type: Number },
        predictionType: { type: String, enum: ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'] },
        deadline: { type: Date },
    },
    // A flag to ensure we only query for these posts
    isGoldenPost: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);