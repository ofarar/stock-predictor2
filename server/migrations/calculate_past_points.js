const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Prediction = require('../models/Prediction');
const { RATING_AWARDS, TARGET_HIT_WEIGHTS } = require('../constants');

const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
console.log('URI:', process.env.MONGODB_URI ? 'Defined' : 'Undefined');

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const predictions = await Prediction.find({
            status: 'Assessed',
            earnedPoints: { $exists: false }
        });

        console.log(`Found ${predictions.length} predictions to migrate.`);

        for (const prediction of predictions) {
            let points = 0;

            // 1. Accuracy Bonus
            if (prediction.rating > 90) points += RATING_AWARDS.ACCURACY_TIER_90;
            else if (prediction.rating > 80) points += RATING_AWARDS.ACCURACY_TIER_80;
            else if (prediction.rating > 70) points += RATING_AWARDS.ACCURACY_TIER_70;

            // 2. Target Hit Bonus
            if (prediction.targetHit) {
                const weight = TARGET_HIT_WEIGHTS[prediction.predictionType] || 1.0;
                points += (RATING_AWARDS.BASE_TARGET_HIT_BONUS * weight);
            }

            prediction.earnedPoints = points;
            await prediction.save();
            // console.log(`Migrated ${prediction._id}: ${points} points`);
        }

        console.log('Migration complete.');
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
