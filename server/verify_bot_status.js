const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const User = require('./models/User');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB.");
        console.log("Connection Host:", mongoose.connection.host);
        console.log("Connection DB Name:", mongoose.connection.name); // <--- This is the key

        const bot = await User.findOne({ username: 'Sigma Alpha' });
        if (!bot) {
            console.log("Bot 'Sigma Alpha' NOT FOUND.");
        } else {
            console.log("Found Bot:", bot._id);
            console.log("isBot value:", bot.isBot, "| Type:", typeof bot.isBot);
            console.log("Username:", bot.username);
        }

        const count = await User.countDocuments({ isBot: true });
        console.log("Total users with isBot=true:", count);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
