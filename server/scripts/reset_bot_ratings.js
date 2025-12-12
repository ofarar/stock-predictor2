const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const resetBotRatings = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Identify Target Users (Dry Run Logic included in execution)
        const targetQuery = {
            isBot: true,
            username: { $ne: "Sigma Alpha" }
        };

        const botsToUpdate = await User.countDocuments(targetQuery);
        console.log(`Found ${botsToUpdate} bots to reset (excluding Sigma Alpha).`);

        if (botsToUpdate === 0) {
            console.log('No bots found to update.');
            process.exit(0);
        }

        // 2. Perform Update
        const result = await User.updateMany(targetQuery, {
            $set: {
                "analystRating.total": 0,
                "analystRating.fromPredictions": 0,
                "analystRating.fromBadges": 0,
                "analystRating.fromShares": 0,
                "analystRating.fromRanks": 0,
                "analystRating.fromReferrals": 0,
                "analystRating.fromBonus": 0,
                "analystRating.shareBreakdown": {},
                "analystRating.predictionBreakdownByStock": {},
                "analystRating.badgeBreakdown": {},
                "analystRating.rankBreakdown": {}
            }
        });

        console.log(`Successfully updated ${result.modifiedCount} bots.`);

        // 3. Verification
        const checkSigma = await User.findOne({ username: "Sigma Alpha" });
        if (checkSigma) {
            console.log(`Verification: Sigma Alpha rating is ${checkSigma.analystRating.total} (Should be untouched)`);
        } else {
            console.log("Verification: Sigma Alpha not found (Active check passed)");
        }

    } catch (error) {
        console.error('Error executing script:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

resetBotRatings();
