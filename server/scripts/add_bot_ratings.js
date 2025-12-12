const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const addBotRatings = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Target: Bots excluding Sigma Alpha
        const targetQuery = {
            isBot: true,
            username: { $ne: "Sigma Alpha" }
        };

        const result = await User.updateMany(targetQuery, {
            $set: {
                "analystRating.total": 20,
                // Attribute to bonus so it appears in the breakdown logically
                "analystRating.fromBonus": 20
            }
        });

        console.log(`Successfully updated ${result.modifiedCount} bots to have 20 Analyst Rating.`);

    } catch (error) {
        console.error('Error executing script:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

addBotRatings();
