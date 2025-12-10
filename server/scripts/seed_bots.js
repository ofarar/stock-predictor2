const mongoose = require('mongoose');
const User = require('../models/User');
const Prediction = require('../models/Prediction');
const { generateBotList } = require('../bot_registry');
const path = require('path');

// Fix: Resolve .env path relative to this file
const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

console.log("--> Script initiated.");
console.log(`--> Loading .env from: ${envPath}`);

async function seedBots() {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            console.error("CRITICAL ERROR: MONGO_URI is missing from process.env");
            process.exit(1);
        }

        console.log("--> Connecting to Database...");
        await mongoose.connect(uri);
        console.log("--> DB Connected Successfully.");

        // --- SAFEST CLEANUP PHASE ---
        console.log("--> Cleaning up existing bot fleet (Safety Mode Check)...");

        // Find candidates for deletion: Bots that are NOT "Sigma Alpha"
        const candidates = await User.find({ isBot: true, username: { $ne: "Sigma Alpha" } });

        let deletedCount = 0;
        let skippedCount = 0;

        for (const candidate of candidates) {
            // Safety Check: Does this bot have predictions?
            const predCount = await Prediction.countDocuments({ userId: candidate._id });

            if (predCount > 0) {
                // SKIP deletion if they have history
                skippedCount++;
            } else {
                await User.deleteOne({ _id: candidate._id });
                deletedCount++;
            }
        }

        console.log(`--> Cleanup Result: Deleted ${deletedCount}, Preserved ${skippedCount} active bots.`);
        // ---------------------

        const botsToCreate = generateBotList();
        console.log(`--> Registry loaded. Found ${botsToCreate.length} bot configurations.`);

        let createdCount = 0;
        let existCount = 0;
        let errorCount = 0;

        console.log("--> Starting Seeding Process...");
        console.log("-----------------------------------------");

        for (const [index, botConfig] of botsToCreate.entries()) {
            try {
                // Check if bot exists
                const exists = await User.findOne({ username: botConfig.username });

                // switch to DiceBear (Legal/Safe)
                // Styles: shapes (abstract professional), initials, identicon
                const avatarUrl = botConfig.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(botConfig.username)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

                if (exists) {
                    existCount++;
                    let hasChanged = false;

                    // Check if avatar has changed or is using old randomuser
                    if (exists.avatar !== avatarUrl || !exists.avatar || exists.avatar.includes('randomuser')) {
                        console.log(`[UPDATE] Updating avatar for ${botConfig.username}`);
                        exists.avatar = avatarUrl;
                        hasChanged = true;
                    }

                    // Check/Update Universe
                    if (!exists.universe || exists.universe.length === 0 || JSON.stringify(exists.universe) !== JSON.stringify(botConfig.universe)) {
                        console.log(`[UPDATE] Syncing universe for ${botConfig.username}`);
                        exists.universe = botConfig.universe;
                        hasChanged = true;
                    }

                    // Check/Update Bio (About)
                    if (exists.about !== botConfig.description) {
                        exists.about = botConfig.description;
                        hasChanged = true;
                    }

                    if (hasChanged) await exists.save();

                    if (index % 10 === 0) process.stdout.write('.');
                    continue;
                }

                // Create new Bot
                const newBot = new User({
                    googleId: `bot_${botConfig.username.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
                    username: botConfig.username,
                    email: `bot_${botConfig.username.replace(/\s+/g, '_').toLowerCase()}@stockpredictorai.com`,
                    avatar: avatarUrl,
                    about: botConfig.description,
                    universe: botConfig.universe, // Explicitly store the universe
                    country: 'XX',
                    isBot: true,
                    aiMetrics: {
                        trainingAccuracy: 85 + Math.random() * 10,
                        lastRetrained: new Date(),
                        specialization: botConfig.category
                    },
                    analystRating: {
                        total: 5000 + Math.floor(Math.random() * 5000),
                        fromPredictions: 2000,
                        fromBadges: 1000,
                        fromShares: 0,
                        fromReferrals: 0,
                        fromRanks: 2000,
                        fromBonus: 0,
                        shareBreakdown: {},
                        predictionBreakdownByStock: {},
                        badgeBreakdown: {},
                        rankBreakdown: {}
                    },
                    isVerified: true
                });

                await newBot.save();
                createdCount++;
                console.log(`[CREATED] ${botConfig.username} (${botConfig.gender})`);

            } catch (innerErr) {
                console.error(`[ERROR] Failed to create ${botConfig.username}:`, innerErr.message);
                errorCount++;
            }
        }

        console.log("\n-----------------------------------------");
        console.log(`Seeding Complete.`);
        console.log(`Total Bots in Registry: ${botsToCreate.length}`);
        console.log(`New Bots Created: ${createdCount}`);
        console.log(`Bot Updates/Skips: ${existCount}`);
        console.log(`Errors: ${errorCount}`);

        process.exit(0);

    } catch (error) {
        console.error("CRITICAL Seeding Error:", error);
        process.exit(1);
    }
}

seedBots();
