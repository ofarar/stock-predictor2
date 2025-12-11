const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const User = require('../models/User');
const Prediction = require('../models/Prediction');

async function cleanupActiveBotPredictions() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("--> Connected to DB");

        // 1. Identify Bot Users
        const bots = await User.find({ isBot: true }).select('_id username');
        const botIds = bots.map(b => b._id);

        console.log(`Found ${bots.length} bots: ${bots.map(b => b.username).join(', ')}`);

        if (botIds.length === 0) {
            console.log("No bots found. Exiting.");
            return;
        }

        // 2. Delete ACTIVE Predictions for these bots
        // The user specifically mentioned "Approved all mistakenly", so status is 'Active'.
        const query = {
            userId: { $in: botIds },
            status: 'Active'
        };

        const count = await Prediction.countDocuments(query);
        console.log(`Found ${count} Active predictions linked to bots.`);

        if (count > 0) {
            const result = await Prediction.deleteMany(query);
            console.log(`--> Deleted ${result.deletedCount} Active predictions.`);
        } else {
            console.log("No Active bot predictions to delete.");
        }

        console.log("--> Cleanup Complete.");

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

cleanupActiveBotPredictions();
