require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');
const Setting = require('../models/Setting');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/stockpredictor')
    .then(async () => {
        console.log("Connected.");
        try {
            const settings = await Setting.findOne();
            console.log(`Global Max Predictions/Day: ${settings?.maxPredictionsPerDay}`);

            const users = await User.find({}).sort({ dailyPredictionCount: -1 }).limit(5);
            console.log(`Found ${users.length} users.`);

            users.forEach(u => {
                const today = new Date().setHours(0, 0, 0, 0);
                const lastPredictionDay = u.lastPredictionDate ? new Date(u.lastPredictionDate).setHours(0, 0, 0, 0) : null;
                const isSameDay = lastPredictionDay === today;

                console.log(`User: ${u.username}`);
                console.log(`  Count: ${u.dailyPredictionCount}`);
                console.log(`  LastPred: ${u.lastPredictionDate ? u.lastPredictionDate.toISOString() : 'None'}`);
                console.log(`  CustomLimit: ${u.customPredictionLimit}`);
                console.log(`  IsSameDay: ${isSameDay}`);
                console.log("---");
            });

        } catch (err) { console.error(err); }
        finally { mongoose.disconnect(); }
    })
    .catch(err => console.error(err));
