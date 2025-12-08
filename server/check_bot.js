const mongoose = require('mongoose');
const User = require('./models/User');
const Prediction = require('./models/Prediction');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");

    const bot = await User.findOne({ username: "Sigma Alpha" });
    if (bot) {
        console.log("Bot Found:", bot.username);
        console.log("AI Metrics:", bot.aiMetrics);
    } else {
        console.log("Bot 'Sigma Alpha' not found.");
    }

    const avgoPred = await Prediction.findOne({ stockTicker: "AVGO" }).sort({ createdAt: -1 });
    if (avgoPred) {
        console.log("Latest AVGO Prediction:", {
            target: avgoPred.targetPrice,
            creationPrice: avgoPred.priceAtCreation,
            direction: avgoPred.targetPrice > avgoPred.priceAtCreation ? "Bullish" : "Bearish"
        });
    }

    process.exit();
}

check();
