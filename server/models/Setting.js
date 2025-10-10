// server/models/Setting.js

// FIX: Changed from 'import mongoose from 'mongoose';'
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const defaultBadgeSettings = {
  "market_maven": {
    "name": "Market Maven",
    "description": "Awarded for achieving a high overall average score across all predictions.",
    "tiers": {
      "Gold": { "score": 90 },
      "Silver": { "score": 80 },
      "Bronze": { "score": 70 }
    }
  },
  "daily_oracle": {
    "name": "Daily Oracle",
    "description": "Awarded for high accuracy specifically on Daily predictions.",
    "tiers": {
      "Gold": { "score": 90 },
      "Silver": { "score": 80 },
      "Bronze": { "score": 70 }
    }
  }
};

const SettingSchema = new Schema({
    isPromoBannerActive: { type: Boolean, default: true },
    badgeSettings: { type: Object, default: defaultBadgeSettings },
    isVerificationEnabled: { type: Boolean, default: false },
    verificationPrice: { type: Number, default: 4.99 },
});

// FIX: Changed from 'export default mongoose.model(...);'
module.exports = mongoose.model('Setting', SettingSchema);