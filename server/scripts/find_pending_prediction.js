const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const predictionSchema = new mongoose.Schema({}, { strict: false });
const Prediction = mongoose.model('predictions', predictionSchema);
const User = mongoose.model('users', new mongoose.Schema({}, { strict: false }));

async function findPendingBotPrediction() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const bots = await User.find({ isBot: true });
        const botIds = bots.map(b => b._id);

        const prediction = await Prediction.findOne({
            status: 'Pending',
            userId: { $in: botIds }
        });

        if (prediction) {
            console.log(JSON.stringify(prediction, null, 2));
            const bot = bots.find(b => b._id.toString() === prediction.userId.toString());
            console.log('Bot:', bot.username);
        } else {
            console.log('No pending bot predictions found.');
        }
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

findPendingBotPrediction();
