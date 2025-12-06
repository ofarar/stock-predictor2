// server/jobs/assessment-job.js

const Prediction = require('../models/Prediction');
const User = require('../models/User');
const PredictionLog = require('../models/PredictionLog');
const JobLog = require('../models/JobLog');
const Notification = require('../models/Notification');
const { awardBadges } = require('../services/badgeService');
const financeAPI = require('../services/financeAPI');
const { PREDICTION_MAX_RATING, PREDICTION_MAX_ERROR_PERCENTAGE, RATING_DIRECTION_CHECK_ENABLED, RATING_AWARDS, TARGET_HIT_WEIGHTS } = require('../constants');
const { calculateProximityRating } = require('../utils/calculations');
const { sendPushToUser } = require('../services/pushNotificationService');

/**
 * Fetches the historical price for a date.
 */
async function getActualStockPrice(ticker, deadline) {
    try {
        // Helper function to format date to 'YYYY-MM-DD'
        const toYYYYMMDD = (date) => date.toISOString().split('T')[0];
        const todayYYYYMMDD = toYYYYMMDD(new Date());
        const deadlineYYYYMMDD = toYYYYMMDD(deadline);

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

        // --- FIX: If the deadline is TODAY, do NOT fall back to yesterday. ---
        // If data is missing for today, it just means the API hasn't updated yet.
        // We should skip assessment and try again later.
        if (deadlineYYYYMMDD === todayYYYYMMDD) {
            console.warn(`No price data for ${ticker} on TODAY (${todayYYYYMMDD}). Skipping assessment until data is available.`);
            return null;
        }

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

/**
 * NEW: Checks if the target price was reached during the prediction window.
 */
async function checkTargetHit(ticker, targetPrice, createdAt, deadline) {
    try {
        const queryOptions = {
            period1: createdAt.toISOString().split('T')[0],
            period2: deadline.toISOString().split('T')[0], // End date is deadline date
            interval: '1d'
        };

        // Yahoo historical data includes High and Low prices for the day.
        const history = await financeAPI.getHistorical(ticker, queryOptions);

        for (const day of history) {
            // Check if the target price falls within the daily high/low range
            if (day.high >= targetPrice && day.low <= targetPrice) {
                // Target hit!
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error(`Target Hit Check failed for ${ticker}:`, error.message);
        return false; // Assume not hit on error
    }
}

const runAssessmentJob = async () => {
    try {
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

        // 1. Query selects predictions past their FULL deadline time (e.g., Friday 21:00 UTC)
        const predictionsToAssess = await Prediction.find({
            status: 'Active',
            deadline: { $lte: new Date() }
        }).populate('userId');

        if (predictionsToAssess.length === 0) {
            console.log('No predictions to assess.');
            return;
        }

        console.log(`Found ${predictionsToAssess.length} predictions to assess.`);

        // 2. Group only by Ticker to minimize API calls
        const predictionGroups = new Map();
        for (const prediction of predictionsToAssess) {
            const ticker = prediction.stockTicker;
            if (!predictionGroups.has(ticker)) {
                predictionGroups.set(ticker, {
                    predictions: [],
                    // Use the deadline of the first prediction in the group as the date to fetch price for.
                    deadline: prediction.deadline
                });
            }
            predictionGroups.get(ticker).predictions.push(prediction);
        }

        console.log(`Grouped into ${predictionGroups.size} unique API calls.`);

        for (const [ticker, group] of predictionGroups.entries()) {
            const predictions = group.predictions;
            const deadlineForAPI = group.deadline;

            try {
                // --- FIX: Determine price based on prediction type ---
                // We'll calculate 'actualPrice' differently for Hourly vs Daily/Weekly.

                // Optimization: Check if ANY prediction in this group is 'Hourly'.
                // If so, we need the CURRENT real-time quote.
                const hasHourly = predictions.some(p => p.predictionType === 'Hourly');
                let realTimePrice = null;

                if (hasHourly) {
                    const quote = await financeAPI.getQuote(ticker);
                    if (quote && quote.price) {
                        realTimePrice = quote.price;
                    }
                }

                // For Daily/Weekly, we need historical (or today's close if available).
                // We'll fetch it once for the group, ONLY if needed.
                const hasNonHourly = predictions.some(p => p.predictionType !== 'Hourly');
                let historicalPrice = null;
                if (hasNonHourly) {
                    historicalPrice = await getActualStockPrice(ticker, deadlineForAPI);
                }

                // --- NEW CRITICAL STEP: Run Target Hit Check ONCE per group ---
                // We use the first prediction's target and creation date for the check
                // as an approximation for the group's target hit status.
                const oldestPrediction = predictions.reduce((min, p) => p.createdAt < min.createdAt ? p : min);

                const targetWasHit = await checkTargetHit(
                    ticker,
                    oldestPrediction.targetPrice,
                    oldestPrediction.createdAt,
                    deadlineForAPI
                );


                const userUpdates = new Map();

                for (const prediction of predictions) {
                    try {
                        let actualPrice = null;

                        if (prediction.predictionType === 'Hourly') {
                            // Use real-time price for Hourly
                            actualPrice = realTimePrice;
                            if (actualPrice === null) {
                                console.warn(`Skipping Hourly assessment for ${ticker}: No real-time quote available.`);
                                continue;
                            }
                        } else {
                            // Use historical price for others
                            actualPrice = historicalPrice;
                            if (actualPrice === null) {
                                // Error already logged in getActualStockPrice
                                continue;
                            }
                        }

                        // 1. Calculate the raw rating (up to 100)
                        const rawRating = calculateProximityRating(prediction.targetPrice, actualPrice, prediction.priceAtCreation);

                        // 2. Apply Time Penalty Cap
                        const maxAllowedRating = prediction.maxRatingAtCreation || 100;
                        const rating = Math.min(rawRating, maxAllowedRating); // Capping the score here

                        // Set the new field in the DB
                        prediction.targetHit = targetWasHit;

                        // --- STRUCTURED LOGGING ---
                        const logEntry = {
                            user: prediction.userId.username,
                            stock: prediction.stockTicker,
                            type: prediction.predictionType,
                            predictionTime: prediction.createdAt,
                            timePenaltyMaxRating: maxAllowedRating,
                            currentPrice: actualPrice,
                            ratingCalculated: rating,
                            targetHitStatus: targetWasHit, // True/False status of the target hit
                            targetHitBonus: targetWasHit ? (RATING_AWARDS.BASE_TARGET_HIT_BONUS * (TARGET_HIT_WEIGHTS[prediction.predictionType] || 1.0)) : 0,
                            assessmentTime: new Date(),
                            timeType: 'UTC'
                        };
                        console.log('[Assessment Log]', JSON.stringify(logEntry));
                        // --- END STRUCTURED LOGGING ---

                        // 3. The rest of the assessment logic uses the capped 'rating'
                        let analystRatingToAward = 0;
                        if (rating > 90) analystRatingToAward = RATING_AWARDS.ACCURACY_TIER_90;
                        else if (rating > 80) analystRatingToAward = RATING_AWARDS.ACCURACY_TIER_80;
                        else if (rating > 70) analystRatingToAward = RATING_AWARDS.ACCURACY_TIER_70;

                        // 4. Award Weighted Target Hit Bonus
                        if (targetWasHit) {
                            const weight = TARGET_HIT_WEIGHTS[prediction.predictionType] || 1.0;

                            // Calculate final bonus: Base Points * Weight
                            const bonusPoints = RATING_AWARDS.BASE_TARGET_HIT_BONUS * weight;

                            // Add bonus points to the analyst's reputation total
                            analystRatingToAward += bonusPoints;
                            console.log(`   --> Awarded +${bonusPoints.toFixed(1)} bonus points for Target Hit (${prediction.predictionType})`);
                        }

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
                        currentUpdate.analystRating += analystRatingToAward; // Sum up analyst rating points
                        currentUpdate.stockTicker = prediction.stockTicker; // Store ticker

                        const userSettings = prediction.userId.notificationSettings;
                        if (!userSettings || userSettings.predictionAssessed !== false) {
                            await new Notification({
                                recipient: prediction.userId._id,
                                type: 'PredictionAssessed',
                                messageKey: 'notifications.predictionAssessed',
                                metadata: {
                                    stockTicker: prediction.stockTicker,
                                    predictionType: prediction.predictionType,
                                    rating: rating
                                },
                                link: `/prediction/${prediction._id}`
                            }).save();

                            // Send Push Notification
                            sendPushToUser(
                                prediction.userId._id,
                                "Prediction Assessed",
                                `Your prediction for ${prediction.stockTicker} has been assessed. You earned a ${rating.toFixed(1)} rating!`,
                                { url: `/prediction/${prediction._id}` },
                                'predictionAssessed'
                            );
                        }

                        await new PredictionLog({
                            predictionId: prediction._id,
                            userId: prediction.userId._id,
                            username: prediction.userId.username,
                            stockTicker: prediction.stockTicker,
                            predictionType: prediction.predictionType,
                            predictedPrice: prediction.targetPrice,
                            actualPrice: actualPrice,
                            rating: rating,
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

                        // --- Update predictionBreakdownByStock ---
                        if (updates.analystRating > 0 && updates.stockTicker) {
                            const stockKey = updates.stockTicker.replace(/\./g, '_'); // Sanitize for Map keys
                            if (!user.analystRating.predictionBreakdownByStock) {
                                user.analystRating.predictionBreakdownByStock = new Map();
                            }
                            const currentStockRating = user.analystRating.predictionBreakdownByStock.get(stockKey) || 0;
                            user.analystRating.predictionBreakdownByStock.set(stockKey, currentStockRating + updates.analystRating);
                        }

                        await user.save();

                        // --- RECALCULATE AND SAVE AVG RATING ---
                        const stats = await Prediction.aggregate([
                            { $match: { userId: user._id, status: 'Assessed' } },
                            { $group: { _id: null, avgRating: { $avg: { $ifNull: ["$rating", "$score"] } } } }
                        ]);

                        if (stats[0]) {
                            await User.findByIdAndUpdate(user._id, { avgRating: stats[0].avgRating });
                        }

                        // Award badges with the now-updated user object
                        await awardBadges(user);

                    } catch (userUpdateError) {
                        console.error(`Failed to update score or award badges for user ${userId}:`, userUpdateError);
                    }
                }

            } catch (outerError) {
                console.error(`Failed to process group ${ticker}:`, outerError);
            }
        }

        console.log('Assessment job finished.');
    } catch (fatalError) {
        console.error('FATAL ERROR in assessment job:', fatalError);
    }
};

module.exports = runAssessmentJob;