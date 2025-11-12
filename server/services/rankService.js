// server/services/rankService.js
const Prediction = require('../models/Prediction');
const User = require('../models/User');

/**
 * Calculates the "Competition Weight" for a leaderboard.
 * @param {number} competitorCount - The total number of users on that leaderboard.
 * @returns {number} - The multiplier (e.g., 1.5, 1.0, 0.5).
 */
const getCompetitionWeight = (competitorCount) => {
    if (competitorCount > 100) return 1.5; // High Competition
    if (competitorCount > 20) return 1.0; // Medium Competition
    return 0.5; // Low Competition
};

/**
 * Calculates the "Base Rank Bonus" for a user's rank.
 * @param {number} rank - The user's rank (1-100).
 * @returns {number} - The base points (e.g., 100, 50, 10, 5).
 */
const getBaseRankBonus = (rank) => {
    if (rank === 1) return 100;
    if (rank <= 10) return 50;
    if (rank <= 50) return 10;
    if (rank <= 100) return 5;
    return 0;
};

/**
 * A generic function to get a full, sorted leaderboard for any category.
 * @param {object} categoryQuery - The MongoDB query (e.g., { predictionType: 'Weekly' }).
 * @returns {Array} - A sorted list of users with their avgScore.
 */
const getLeaderboard = async (categoryQuery = {}) => {
    const matchQuery = { status: 'Assessed', ...categoryQuery };
    
    return await Prediction.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$userId', avgScore: { $avg: '$score' }, predictionCount: { $sum: 1 } } },
        { $match: { predictionCount: { $gt: 0 } } }, // Ensure they have predictions
        { $sort: { avgScore: -1 } }
    ]);
};

/**
 * This function runs on a schedule (e.g., weekly) to award points for an entire leaderboard.
 */
const awardPointsForCategory = async (categoryName, categoryQuery) => {
    console.log(`Rank Job: Starting check for '${categoryName}' leaderboard...`);
    try {
        const leaderboard = await getLeaderboard(categoryQuery);
        const competitorCount = leaderboard.length;
        if (competitorCount === 0) {
            console.log(`Rank Job: No competitors found for '${categoryName}'. Skipping.`);
            return;
        }

        const competitionWeight = getCompetitionWeight(competitorCount);
        const top100 = leaderboard.slice(0, 100);

        let updates = new Map();

        top100.forEach((user, index) => {
            const rank = index + 1;
            const baseBonus = getBaseRankBonus(rank);
            const pointsToAward = Math.round(baseBonus * competitionWeight);

            if (pointsToAward > 0) {
                updates.set(user._id.toString(), pointsToAward);
            }
        });

        if (updates.size === 0) {
            console.log(`Rank Job: No points to award for '${categoryName}'.`);
            return;
        }

        // Batch update all users who earned points
        const bulkOps = [];
        for (const [userId, points] of updates.entries()) {
            bulkOps.push({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(userId) },
                    update: {
                        $inc: {
                            'analystRating.total': points,
                            'analystRating.fromRanks': points
                        }
                    }
                }
            });
        }
        
        await User.bulkWrite(bulkOps);
        console.log(`Rank Job: Awarded points to ${updates.size} users for '${categoryName}' leaderboard.`);

    } catch (err) {
        console.error(`Rank Job: Error processing '${categoryName}': ${err.message}`);
    }
};

/**
 * This function runs instantly when a prediction is scored.
 * It checks only the leaderboards the user *just* affected.
 */
const checkAndAwardRealtimeRanks = async (user, prediction) => {
    const categoriesToCheck = [
        { name: 'Overall', query: {} },
        { name: prediction.predictionType, query: { predictionType: prediction.predictionType } },
        { name: prediction.stockTicker, query: { stockTicker: prediction.stockTicker } }
    ];

    // Only check Hourly/Daily ranks in real-time
    if (!['Hourly', 'Daily'].includes(prediction.predictionType)) {
        categoriesToCheck.splice(1, 1); // Remove the predictionType check
    }

    for (const cat of categoriesToCheck) {
        try {
            const leaderboard = await getLeaderboard(cat.query);
            const competitorCount = leaderboard.length;
            if (competitorCount < 1) continue; // Skip if no competition

            const userRankIndex = leaderboard.findIndex(u => u._id.toString() === user._id.toString());
            const userRank = userRankIndex === -1 ? null : userRankIndex + 1;

            if (userRank && userRank <= 100) { // Only award if in Top 100
                const competitionWeight = getCompetitionWeight(competitorCount);
                const baseBonus = getBaseRankBonus(userRank);
                const pointsToAward = Math.round(baseBonus * competitionWeight);

                if (pointsToAward > 0) {
                    // This is an "instant" bonus. We'll give a small, fixed amount for *achieving* a rank.
                    // The large bonuses will come from the scheduled jobs.
                    // This is a design choice: do we give the full bonus now or just a "nudge"?
                    // Let's give the full bonus now, but only if their rank *changed*...
                    // For simplicity, we'll award a small, flat "real-time" bonus for *being* in the Top 100.
                    // The *big* points will come from the scheduled jobs.
                    
                    // Let's stick to the original plan: the scheduled jobs will handle this.
                    // The real-time check is too complex.
                    
                    // --- SIMPLIFIED PLAN ---
                    // The assessment-job will ONLY handle scoring.
                    // ALL rank awarding will be done by scheduled jobs.
                    // This is cleaner and avoids the complexity of real-time rank checks.
                    // I will REVERT the plan from my last message and go with the user's
                    // original insight: check ranks on a schedule.
                    
                    // ---> THIS SERVICE WILL ONLY BE USED BY THE SCHEDULED JOBS <---
                }
            }
        } catch (err) {
            console.error(`Realtime Rank Check Error for ${user.username} in ${cat.name}: ${err.message}`);
        }
    }
};

// We only need to export the main scheduled job runner
module.exports = { awardPointsForCategory, getLeaderboard };