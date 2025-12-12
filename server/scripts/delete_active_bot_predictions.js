const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const User = require('../models/User');
const Prediction = require('../models/Prediction');

async function cleanupActiveBotPredictions() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("--> Connected to DB");

        // 1. Identify Bot Users (Exclude Sigma Alpha)
        const bots = await User.find({
            isBot: true,
            username: { $ne: 'Sigma Alpha' }
        }).select('_id username');

        const botIds = bots.map(b => b._id);

        console.log(`Found ${bots.length} bots to clear (Excluding Sigma Alpha):`);
        console.log(bots.map(b => b.username).join(', '));

        if (botIds.length === 0) {
            console.log("No eligible bots found. Exiting.");
            return;
        }

        // 2. Delete ACTIVE and PENDING Predictions for these bots
        const query = {
            userId: { $in: botIds },
            status: { $in: ['Active', 'Pending'] }
        };

        const count = await Prediction.countDocuments(query);
        console.log(`Found ${count} Active/Pending predictions linked to target bots.`);

        if (count > 0) {
            const result = await Prediction.deleteMany(query);
            console.log(`--> Deleted ${result.deletedCount} Active/Pending predictions.`);
        } else {
            console.log("No Active/Pending bot predictions to delete.");
        }

        console.log("--> Cleanup Complete.");

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

cleanupActiveBotPredictions();
