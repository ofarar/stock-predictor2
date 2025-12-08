require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/stockpredictor')
    .then(async () => {
        console.log("Connected.");
        const user = await User.findOne({ username: "Faruk Altan" });
        if (user) {
            console.log(`User found: ${user.username}, CustomLimit: ${user.customPredictionLimit}`);
            user.customPredictionLimit = null;
            await user.save();
            console.log("Custom limit reset to null.");
        } else {
            console.log("User 'Faruk Altan' not found.");
        }
        mongoose.disconnect();
    })
    .catch(err => console.error(err));
