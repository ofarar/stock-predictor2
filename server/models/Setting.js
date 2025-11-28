// server/models/Setting.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const defaultBadgeSettings = {
  "market_maven": {
    "name": "Market Maven",
    "description": "Awarded for achieving a high overall average score across all predictions.",
    "tiers": {
      "Gold": { "rating": 90 },
      "Silver": { "rating": 80 },
      "Bronze": { "rating": 70 }
    }
  },
  "daily_oracle": {
    "name": "Daily Oracle",
    "description": "Awarded for high accuracy specifically on Daily predictions.",
    "tiers": {
      "Gold": { "rating": 90 },
      "Silver": { "rating": 80 },
      "Bronze": { "rating": 70 }
    }
  }
};

const SettingSchema = new Schema({
  isPromoBannerActive: { type: Boolean, default: true },
  isEarningsBannerActive: { type: Boolean, default: true }, // <--- NEW: Controls Earnings Banner visibility
  badgeSettings: { type: Object, default: defaultBadgeSettings },
  isVerificationEnabled: { type: Boolean, default: false },
  verificationPrice: { type: Number, default: 4.99 },
  isAIWizardEnabled: { type: Boolean, default: false },
  maxPredictionsPerDay: { type: Number, default: 20 },
  isFinanceApiEnabled: { type: Boolean, default: true },
  isXIconEnabled: { type: Boolean, default: true }, // Should be 'true'
  xAccountUrl: { type: String, default: 'https://x.com/SPredictor25790' }
});

module.exports = mongoose.model('Setting', SettingSchema);