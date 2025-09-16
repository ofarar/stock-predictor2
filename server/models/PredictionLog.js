const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PredictionLogSchema = new Schema({
    predictionId: { type: Schema.Types.ObjectId, ref: 'Prediction', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String },
    stockTicker: { type: String, required: true },
    predictionType: { type: String, required: true },
    predictedPrice: { type: Number, required: true },
    actualPrice: { type: Number, required: true },
    score: { type: Number, required: true },
    assessedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PredictionLog', PredictionLogSchema);