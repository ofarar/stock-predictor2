const Prediction = require('../models/Prediction');
const User = require('../models/User');
const PredictionLog = require('../models/PredictionLog');
const Notification = require('../models/Notification');
const yahooFinance = require('yahoo-finance2').default;
const { awardBadges } = require('../services/badgeService'); // FIX: Import the awardBadges function

/**
 * Calculates a score based on how close a prediction was to the actual price.
 * @param {number} predictedPrice - The user's predicted price.
 * @param {number} actualPrice - The actual market price at the deadline.
 * @returns {number} - The calculated score, from 0 to 100.
 */
function calculateProximityScore(predictedPrice, actualPrice) {
    const MAX_SCORE = 100;
    const MAX_ERROR_PERCENTAGE = 0.20; // Predictions off by >20% get 0 points.

    if (actualPrice === 0) return 0;

    const error = Math.abs(predictedPrice - actualPrice);
    const errorPercentage = error / actualPrice;

    if (errorPercentage > MAX_ERROR_PERCENTAGE) {
        return 0;
    }

    const score = MAX_SCORE * (1 - (errorPercentage / MAX_ERROR_PERCENTAGE));
    
    // --- THIS IS THE CORRECT LINE ---
    // It ensures the score is saved with one decimal place (e.g., 91.8)
    return parseFloat(score.toFixed(1)); 
}

/**
 * Fetches the historical price of a stock for a specific date (deadline).
 * @param {string} ticker - The stock ticker.
 * @param {Date} deadline - The date for which to fetch the closing price.
 * @returns {number|null} - The closing price or null if not found.
 */
async function getActualStockPrice(ticker, deadline) {
    try {
        console.log(`Fetching historical price for ${ticker} on ${deadline.toISOString().split('T')[0]}`);
        const queryOptions = {
            period1: deadline,
            period2: new Date(deadline.getTime() + 24 * 60 * 60 * 1000), // A one-day range
        };
        const result = await yahooFinance.historical(ticker, queryOptions);

        if (result && result.length > 0) {
            // Return the closing price for that day
            return result[0].close;
        }
        return null;
    } catch (error) {
        console.error(`Could not fetch price for ${ticker}:`, error.message);
        return null;
    }
}

const runAssessmentJob = async () => {
    console.log('Starting assessment job...');

    const predictionsToAssess = await Prediction.find({
        status: 'Active',
        deadline: { $lte: new Date() }
    }).populate('userId', 'username followers'); // Also populate followers for badge notifications

    if (predictionsToAssess.length === 0) {
        console.log('No predictions to assess.');
        return;
    }

    console.log(`Found ${predictionsToAssess.length} predictions to assess.`);

    for (const prediction of predictionsToAssess) {
        try {
            const actualPrice = await getActualStockPrice(prediction.stockTicker, prediction.deadline);

            if (actualPrice === null) {
                console.error(`Could not get price for ${prediction.stockTicker}. Skipping.`);
                continue;
            }

            const score = calculateProximityScore(prediction.targetPrice, actualPrice);

            // Update Prediction
            prediction.status = 'Assessed';
            prediction.score = score;
            prediction.actualPrice = actualPrice;
            await prediction.save();

            // Update User's Total Score
            const user = await User.findById(prediction.userId._id);
            if (user) {
                user.score += score;
                await user.save();
            } else {
                console.warn(`Could not find user with ID ${prediction.userId._id} to update score.`);
                continue; 
            }

            // --- Create "Score Assessed" Notification ---
            await new Notification({
                recipient: prediction.userId._id,
                type: 'PredictionAssessed',
                messageKey: 'notifications.predictionAssessed',
                metadata: {
                    stockTicker: prediction.stockTicker,
                    predictionType: prediction.predictionType,
                    score: score
                },
                link: `/prediction/${prediction._id}`
            }).save();
            // ------------------------------------------

            // Create a detailed log for your records
            await new PredictionLog({
                predictionId: prediction._id,
                userId: prediction.userId._id,
                username: prediction.userId.username,
                stockTicker: prediction.stockTicker,
                predictionType: prediction.predictionType,
                predictedPrice: prediction.targetPrice,
                actualPrice: actualPrice,
                score: score,
            }).save();

            console.log(`Assessed prediction for ${prediction.stockTicker}. User ${prediction.userId.username} scored ${score} points.`);

            // FIX: This call will now work because awardBadges is imported.
            // Pass the full user object, as the service calculates stats internally.
            await awardBadges(user);

        } catch (error) {
            console.error(`Failed to assess prediction ${prediction._id}:`, error);
        }
    }

    console.log('Assessment job finished.');
};

module.exports = runAssessmentJob;