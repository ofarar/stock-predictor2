const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SettingSchema = new Schema({
    // We will only have one document in this collection, used to control all settings
    isPromoBannerActive: {
        type: Boolean,
        default: true
    },
    // You can add more settings here in the future
    // isNewFeatureEnabled: { type: Boolean, default: false }
});

module.exports = mongoose.model('Setting', SettingSchema);