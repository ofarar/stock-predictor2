// server/jobs/assessment-job.js

const Prediction = require('../models/Prediction');
const User = require('../models/User');
const PredictionLog = require('../models/PredictionLog');
const JobLog = require('../models/JobLog');
const Notification = require('../models/Notification');
const { awardBadges } = require('../services/badgeService');
const financeAPI = require('../services/financeAPI'); // <-- USE THE ADAPTER

/**
 * Calculates a score based on how close a prediction was to the actual price.
 * (This function remains unchanged)
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
    return parseFloat(score.toFixed(1));
}

/**
 * Fetches the historical price of a stock for a specific date (deadline).
 * (This function is now updated to use the financeAPI adapter)
 */
async function getActualStockPrice(ticker, deadline) {
    try {
        // Format deadline to 'YYYY-MM-DD'
        const dateString = deadline.toISOString().split('T')[0];

        console.log(`Fetching historical price for ${ticker} on ${dateString}`);

        // Use the adapter's getHistorical function
        const result = await financeAPI.getHistorical(ticker, {
            period1: dateString,
            interval: '1d' // Ensure we ask for daily
        });

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
    try {
        await JobLog.findOneAndUpdate(
            { jobId: 'assessment-job' },
            { lastAttemptedRun: new Date() },
            { upsert: true }
        );
    } catch (err) {
        console.error("CRITICAL: Could not update cron job heartbeat.", err);
    }

    console.log('Starting assessment job...');

    const predictionsToAssess = await Prediction.find({
        status: 'Active',
        deadline: { $lte: new Date() }
    }).populate('userId', 'username followers notificationSettings'); // <-- Get notificationSettings

    if (predictionsToAssess.length === 0) {
        console.log('No predictions to assess.');
        return;
    }

    console.log(`Found ${predictionsToAssess.length} predictions to assess.`);

    // --- START: OPTIMIZATION LOGIC ---

    // 1. Group predictions by Ticker and Deadline
    // We create a unique key like "AAPL-2025-11-07"
    const predictionGroups = new Map();

    for (const prediction of predictionsToAssess) {
        // Use toISOString and split to get a clean 'YYYY-MM-DD' date key
        const dateKey = prediction.deadline.toISOString().split('T')[0];
        const key = `${prediction.stockTicker}-${dateKey}`;

        if (!predictionGroups.has(key)) {
            predictionGroups.set(key, []);
        }
        predictionGroups.get(key).push(prediction);
    }

    console.log(`Grouped into ${predictionGroups.size} unique API calls.`);

    // 2. Loop over the GROUPS, not the individual predictions
    for (const [key, predictions] of predictionGroups.entries()) {
        const [ticker, dateKey] = key.split('-');
        const deadline = new Date(dateKey); // Re-create the Date object for the API call

        try {
            // 3. Make ONE API call per group
            const actualPrice = await getActualStockPrice(ticker, deadline);

            if (actualPrice === null) {
                console.error(`Could not get price for ${ticker}. Skipping ${predictions.length} predictions.`);
                continue; // Skip this whole group
            }

            // A map to hold user score updates, so we only update each user once
            const userScoreUpdates = new Map();

            // 4. Loop over the PREDICTIONS within the group (fast, no API calls)
            for (const prediction of predictions) {
                try {
                    const score = calculateProximityScore(prediction.targetPrice, actualPrice);

                    // --- NEW: Analyst Rating Logic ---
                    let ratingToAward = 0;
                    if (score > 90) {
                        ratingToAward = 10; // Excellent Prediction
                    } else if (score > 80) {
                        ratingToAward = 5;  // Great Prediction
                    } else if (score > 70) {
                        ratingToAward = 2;  // Good Prediction
                    }
                    // (Scores below 70 get 0 points)
                    // --- END NEW LOGIC ---

                    // Update Prediction
                    prediction.status = 'Assessed';
                    prediction.score = score;
                    prediction.actualPrice = actualPrice;
                    await prediction.save();

                    // Add score to the user's update map
                    const userId = prediction.userId._id.toString();
                    const currentUpdate = userScoreUpdates.get(userId) || { score: 0, rating: 0 };
                    userScoreUpdates.set(userId, {
                        score: currentUpdate.score + score,
                        rating: currentUpdate.rating + ratingToAward
                    });

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

                    // Create a detailed log
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

                    console.log(`Assessed prediction for ${ticker}. User ${prediction.userId.username} scored ${score} points.`);

                } catch (innerError) {
                    console.error(`Failed to assess (inner loop) prediction ${prediction._id}:`, innerError);
                    // Don't stop, continue to the next prediction in the group
                }
            } // --- End of inner prediction loop ---

            // 5. Now, update all users in this group (Batch DB update)
            for (const [userId, updates] of userScoreUpdates.entries()) {
                try {
                    // --- FIX: Use Read-Modify-Save ---
                    // --- FIX: Use Read-Modify-Save & Data Migration ---
                    const user = await User.findById(userId);
                    if (!user) continue; // Skip if user was deleted

                    let currentRating = user.analystRating;
                    if (typeof currentRating !== 'object' || currentRating === null) {
                        // This user has the old 'number' schema or no schema.
                        // We'll assume old points were from predictions as a default.
                        const oldPoints = typeof currentRating === 'number' ? currentRating : 0;
                        user.analystRating = {
                            total: oldPoints,
                            fromPredictions: oldPoints, // Assume old points came from here
                            fromBadges: 0,
                            fromShares: 0,
                            fromReferrals: 0,
                            fromRanks: 0
                        };
                    }

                    user.score = (user.score || 0) + updates.score;
                    user.analystRating.total = (user.analystRating.total || 0) + updates.rating;
                    user.analystRating.fromPredictions = (user.analystRating.fromPredictions || 0) + updates.rating;

                    await user.save();
                    // --- END FIX ---

                    // We already have the user object, so we can pass it directly
                    await awardBadges(user);
                    // --- END FIX ---
                } catch (userUpdateError) {
                    console.error(`Failed to update score or award badges for user ${userId}:`, userUpdateError);
                }
            }

            // --- FIX: This block was removed in a previous step by mistake ---
            // This block should be *outside* the inner loop, but *inside* the outer loop
            for (const [userId, updates] of userScoreUpdates.entries()) {
                try {
                    // --- FIX: Use Read-Modify-Save & Data Migration ---
                    const user = await User.findById(userId);
                    if (!user) continue; // Skip if user was deleted

                    let currentRating = user.analystRating;
                    if (typeof currentRating !== 'object' || currentRating === null) {
                        const oldPoints = typeof currentRating === 'number' ? currentRating : 0;
                        user.analystRating = {
                            total: oldPoints, fromPredictions: oldPoints, fromBadges: 0,
                            fromShares: 0, fromReferrals: 0, fromRanks: 0
                        };
                    }

                    user.score = (user.score || 0) + updates.score;
                    user.analystRating.total = (user.analystRating.total || 0) + updates.rating;
                    user.analystRating.fromPredictions = (user.analystRating.fromPredictions || 0) + updates.rating;

                    await user.save();
                    // --- END FIX ---

                    // We already have the user object, so we can pass it directly
                    await awardBadges(user); // <-- This is correct

                } catch (userUpdateError) {
                    console.error(`Failed to update score or award badges for user ${userId}:`, userUpdateError);
                }
            }
            // --- END FIX ---

        } catch (outerError) { // This catch is for the getActualStockPrice call
            console.error(`Failed to process group ${key}:`, outerError);
            // Don't stop, continue to the next group
        }
    } // --- End of outer group loop ---

    // --- END: OPTIMIZATION LOGIC ---

    console.log('Assessment job finished.');
};

module.exports = runAssessmentJob;