const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PredictionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    stockTicker: { type: String, required: true, uppercase: true, index: true },
    targetPrice: { type: Number, required: true },
    targetPriceAtCreation: { type: Number },
    predictionType: { type: String, enum: ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'], required: true },
    deadline: { type: Date, required: true },
    status: { type: String, enum: ['Active', 'Assessed', 'Pending', 'Rejected'], default: 'Active' },
    rating: { type: Number, default: 0 },
    earnedPoints: { type: Number }, // Points earned for this prediction (Analyst Rating)
    actualPrice: { type: Number },
    priceAtCreation: { type: Number },
    maxRatingAtCreation: { type: Number, default: 100 },
    currency: { type: String, default: 'USD' },
    description: { type: String, maxLength: 2000 },
    initialDescription: { type: String, maxLength: 2000 },
    featureVector: { type: Object }, // Stores exact model inputs (X) for retraining
    targetHit: { type: Boolean, default: false }, // Track if the target was hit before/at deadline
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    dislikes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    guestLikes: [{ type: String }], // Array of guest IDs (UUIDs)
    guestDislikes: [{ type: String }], // Array of guest IDs (UUIDs)

    history: [{
        updatedAt: { type: Date, default: Date.now },
        previousTargetPrice: { type: Number, required: true },
        newTargetPrice: { type: Number, required: true },
        reason: { type: String, maxLength: 2000 },
        priceAtTimeOfUpdate: { type: Number } // The "blue dot" value
    }],
    views: { type: Number, default: 0, index: true },
    assessedAt: { type: Date, index: true }, // Time when the prediction was assessed
}, { timestamps: true });

// --- PERFORMANCE INDEXES ---
// 1. For Rank Jobs (filters by status='Assessed' and predictionType)
PredictionSchema.index({ status: 1, predictionType: 1 });

// 2. For Assessment Jobs (filters by status='Active' and deadline <= now)
PredictionSchema.index({ status: 1, deadline: 1 });

// 3. For User Stats Aggregation (frequently calculates avg rating for a user)
PredictionSchema.index({ userId: 1, status: 1 });

// 4. For Hourly Winners (filters by status='Assessed' and assessedAt)
PredictionSchema.index({ status: 1, assessedAt: -1 });

module.exports = mongoose.model('Prediction', PredictionSchema);