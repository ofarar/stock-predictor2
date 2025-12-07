const Prediction = require('../models/Prediction');
const { awardBadges } = require('./badgeService');

/**
 * Recalculates analytics, ratings, and badges for a single user.
 * @param {Object} user - The Mongoose user document.
 */
async function recalculateUserAnalytics(user) {
    if (!user) return;

    // 1. Reset Analytics Structure
    user.badges = [];
    if (typeof user.analystRating !== 'object' || user.analystRating === null) {
        user.analystRating = {
            total: 0,
            fromPredictions: 0,
            fromBadges: 0,
            fromShares: 0,
            fromReferrals: 0,
            fromRanks: 0,
            fromBonus: 0,
            shareBreakdown: {},
            predictionBreakdownByStock: {},
            badgeBreakdown: {},
            rankBreakdown: {}
        };
    }

    // Preserve points that are not derived from predictions/badges
    const sharesPoints = user.analystRating.fromShares || 0;
    const referralPoints = user.analystRating.fromReferrals || 0;
    const bonusPoints = user.analystRating.fromBonus || 0; // Don't lose bonus points if they exist

    user.analystRating.total = sharesPoints + referralPoints + bonusPoints;
    user.analystRating.fromPredictions = 0;
    user.analystRating.fromBadges = 0;
    user.analystRating.fromRanks = 0;
    user.analystRating.predictionBreakdownByStock = new Map();
    user.analystRating.badgeBreakdown = new Map();
    user.analystRating.rankBreakdown = new Map();

    // 2. Process Predictions
    const userPredictionsData = await Prediction.find({ userId: user._id, status: 'Assessed' }).lean();
    const userPredictions = userPredictionsData.map(p => {
        if (p.score !== undefined) p.rating = p.score;
        return p;
    });

    if (userPredictions.length > 0) {
        for (const p of userPredictions) {
            let ratingToAward = 0;
            // Use p.rating || 0 to be safe, though map above handles score->rating
            const r = p.rating || 0;
            if (r > 90) ratingToAward = 10;
            else if (r > 80) ratingToAward = 5;
            else if (r > 70) ratingToAward = 2;

            if (ratingToAward > 0) {
                user.analystRating.fromPredictions += ratingToAward;
                const stockKey = p.stockTicker.replace(/\./g, '_');
                const currentStockRating = user.analystRating.predictionBreakdownByStock.get(stockKey) || 0;
                user.analystRating.predictionBreakdownByStock.set(stockKey, currentStockRating + ratingToAward);
            }
        }

        // 3. Award Badges (This function adds to fromBadges and updates badgeBreakdown)
        // Note: awardBadges expects the user object to have the updated predictions implicit context
        // simpler approach: awardBadges mostly reads from DB again or we might need to be careful.
        // Looking at badgeService.js: It fetches predictions AGAIN: `await Prediction.find({ userId: user._id, status: 'Assessed' })`
        // So passing the user object is enough.
        await awardBadges(user);
    }

    // 4. Update Average Rating
    const stats = await Prediction.aggregate([
        { $match: { userId: user._id, status: 'Assessed' } },
        { $group: { _id: null, avgRating: { $avg: { $ifNull: ["$rating", "$score"] } } } }
    ]);
    user.avgRating = stats[0] ? stats[0].avgRating : 0;

    // 5. Final Total Calculation
    // awardBadges updates the user object in place with new badges and badge ratings.
    user.analystRating.total =
        (user.analystRating.fromPredictions || 0) +
        (user.analystRating.fromBadges || 0) +
        (user.analystRating.fromShares || 0) +
        (user.analystRating.fromReferrals || 0) +
        (user.analystRating.fromRanks || 0) +
        (user.analystRating.fromBonus || 0);

    await user.save();
    return user;
}

module.exports = { recalculateUserAnalytics };
