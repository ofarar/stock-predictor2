// server/jobs/assessment-job.js
// --- ENTIRE FILE REPLACEMENT ---

const Prediction = require('../models/Prediction');
const User = require('../models/User');
const PredictionLog = require('../models/PredictionLog');
const JobLog = require('../models/JobLog');
const Notification = require('../models/Notification');
const { awardBadges } = require('../services/badgeService');
const financeAPI = require('../services/financeAPI');

/**
 * Calculates a rating based on how close a prediction was to the actual price.
 */
function calculateProximityRating(predictedPrice, actualPrice) {
    const MAX_RATING = 100;
    const MAX_ERROR_PERCENTAGE = 0.20;
    if (actualPrice === 0) return 0;
    const error = Math.abs(predictedPrice - actualPrice);
    const errorPercentage = error / actualPrice;
    if (errorPercentage > MAX_ERROR_PERCENTAGE) {
        return 0;
    }
    const rating = MAX_RATING * (1 - (errorPercentage / MAX_ERROR_PERCENTAGE));
    return parseFloat(rating.toFixed(1));
}

/**
 * Fetches the historical price for a date.
 * If it fails (weekend/holiday), it will "walk backwards" up to 4 days to find the last valid trading day.
 */
async function getActualStockPrice(ticker, deadline) {
    try {
        // Helper function to format date to 'YYYY-MM-DD'
        const toYYYYMMDD = (date) => date.toISOString().split('T')[0];

        // Helper function to make the API call (uses v3-compatible period1/period2)
        const fetchPrice = async (date) => {
            const period1 = toYYYYMMDD(date);

            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            const period2 = toYYYYMMDD(nextDay);

            const result = await financeAPI.getHistorical(ticker, {
                period1: period1,
                period2: period2,
                interval: '1d'
            });

            if (result && result.length > 0 && result[0].close) {
                return result[0].close; // Success
            }
            return null; // No data for this day
        };

        let price = await fetchPrice(deadline);
        if (price !== null) return price; // Got it on the first try

        // 1st Retry (T-1)
        console.warn(`No price data for ${ticker} on ${toYYYYMMDD(deadline)}. Retrying for T-1.`);
        const tMinus1 = new Date(deadline);
        tMinus1.setDate(tMinus1.getDate() - 1);
        price = await fetchPrice(tMinus1);
        if (price !== null) return price;

        // 2nd Retry (T-2)
        console.warn(`No price data for ${ticker} on ${toYYYYMMDD(tMinus1)}. Retrying for T-2.`);
        const tMinus2 = new Date(deadline);
        tMinus2.setDate(tMinus2.getDate() - 2);
        price = await fetchPrice(tMinus2);
        if (price !== null) return price;

        // 3rd Retry (T-3) - Final attempt (for long weekends)
        console.warn(`No price data for ${ticker} on ${toYYYYMMDD(tMinus2)}. Retrying for T-3.`);
        const tMinus3 = new Date(deadline);
        tMinus3.setDate(tMinus3.getDate() - 3);
        price = await fetchPrice(tMinus3);
        if (price !== null) return price;

        // Give up
        console.error(`Could not get price for ${ticker} even after 3 retries. Skipping.`);
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

    // Populate the full user object, including new fields
    const predictionsToAssess = await Prediction.find({
        status: 'Active',
        deadline: { $lte: new Date() }
    }).populate('userId');

    if (predictionsToAssess.length === 0) {
        console.log('No predictions to assess.');
        return;
    }

    console.log(`Found ${predictionsToAssess.length} predictions to assess.`);

    const predictionGroups = new Map();
    for (const prediction of predictionsToAssess) {
        const dateKey = prediction.deadline.toISOString().split('T')[0];
        const key = `${prediction.stockTicker}::${dateKey}`;

        if (!predictionGroups.has(key)) {
            predictionGroups.set(key, []);
        }
        predictionGroups.get(key).push(prediction);
    }

    console.log(`Grouped into ${predictionGroups.size} unique API calls.`);

    for (const [key, predictions] of predictionGroups.entries()) {
        const [ticker, dateKey] = key.split('::');
        const deadline = new Date(dateKey);

        try {
            const actualPrice = await getActualStockPrice(ticker, deadline);

            if (actualPrice === null) {
                console.error(`Could not get price for ${ticker} on ${dateKey} after retries. Skipping ${predictions.length} predictions.`);
                continue;
            }

            const userUpdates = new Map();

            for (const prediction of predictions) {
                try {
                    const rating = calculateProximityRating(prediction.targetPrice, actualPrice);

                    let analystRatingToAward = 0;
                    if (rating > 90) analystRatingToAward = 10;
                    else if (rating > 80) analystRatingToAward = 5;
                    else if (rating > 70) analystRatingToAward = 2;

                    prediction.status = 'Assessed';
                    prediction.rating = rating;
                    prediction.actualPrice = actualPrice;
                    await prediction.save();

                    const userId = prediction.userId._id.toString();
                    if (!userUpdates.has(userId)) {
                        // Store the populated user object from the prediction
                        userUpdates.set(userId, { rating: 0, analystRating: 0, user: prediction.userId, stockTicker: prediction.stockTicker });
                    }
                    const currentUpdate = userUpdates.get(userId);
                    currentUpdate.rating += rating; // This is for user.totalRating
                    currentUpdate.stockTicker = prediction.stockTicker; // Store ticker

                    await new Notification({
                        recipient: prediction.userId._id,
                        type: 'PredictionAssessed',
                        messageKey: 'notifications.predictionAssessed',
                        metadata: {
                            stockTicker: prediction.stockTicker,
                            predictionType: prediction.predictionType,
                            rating: rating // <-- Changed from 'score'
                        },
                        link: `/prediction/${prediction._id}`
                    }).save();

                    await new PredictionLog({
                        predictionId: prediction._id,
                        userId: prediction.userId._id,
                        username: prediction.userId.username,
                        stockTicker: prediction.stockTicker,
                        predictionType: prediction.predictionType,
                        predictedPrice: prediction.targetPrice,
                        actualPrice: actualPrice,
                        rating: rating, // <-- Changed from 'score'
                    }).save();

                    console.log(`Assessed prediction for ${ticker}. User ${prediction.userId.username} earned a ${rating} rating.`);

                } catch (innerError) {
                    console.error(`Failed to assess (inner loop) prediction ${prediction._id}:`, innerError);
                }
            }

            // 5. Now, update all users in this group (Batch DB update)
            for (const [userId, updates] of userUpdates.entries()) {
                try {
                    const user = updates.user; // Get the populated user object

                    // --- FIX: On-the-fly migration for old users ---
                    if (typeof user.analystRating !== 'object' || user.analystRating === null) {
                        const oldPoints = typeof user.analystRating === 'number' ? user.analystRating : 0;
                        user.analystRating = {
                            total: oldPoints, fromPredictions: oldPoints, fromBadges: 0, fromShares: 0, fromReferrals: 0, fromRanks: 0,
                            fromBonus: 0, predictionBreakdownByStock: {}, badgeBreakdown: {}, rankBreakdown: {}, shareBreakdown: {}
                        };
                    }

                    // Apply updates
                    user.totalRating = (user.totalRating || 0) + updates.rating; // <-- Use totalRating
                    user.analystRating.total = (user.analystRating.total || 0) + updates.analystRating;
                    user.analystRating.fromPredictions = (user.analystRating.fromPredictions || 0) + updates.analystRating;

                    // --- NEW: Update predictionBreakdownByStock ---
                    if (updates.analystRating > 0 && updates.stockTicker) {
                        const stockKey = updates.stockTicker.replace(/\./g, '_'); // Sanitize for Map keys
                        if (!user.analystRating.predictionBreakdownByStock) {
                            user.analystRating.predictionBreakdownByStock = new Map();
                        }
                        const currentStockRating = user.analystRating.predictionBreakdownByStock.get(stockKey) || 0;
                        user.analystRating.predictionBreakdownByStock.set(stockKey, currentStockRating + updates.analystRating);
                    }
                    // --- END NEW ---

                    await user.save();

                    // Award badges with the now-updated user object
                    await awardBadges(user);

                } catch (userUpdateError) {
                    console.error(`Failed to update score or award badges for user ${userId}:`, userUpdateError);
                }
            }

        } catch (outerError) {
            console.error(`Failed to process group ${key}:`, outerError);
        }
    }

    console.log('Assessment job finished.');
};

module.exports = runAssessmentJob;