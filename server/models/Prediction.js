const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PredictionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    stockTicker: { type: String, required: true, uppercase: true, index: true },
    targetPrice: { type: Number, required: true },
    predictionType: { type: String, enum: ['Hourly', 'Daily', 'Weekly', 'Quarterly', 'Yearly'], required: true },
    deadline: { type: Date, required: true },
    status: { type: String, enum: ['Active', 'Assessed'], default: 'Active' },
    score: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Prediction', PredictionSchema);