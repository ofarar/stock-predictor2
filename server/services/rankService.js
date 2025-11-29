// server/services/rankService.js
const Prediction = require('../models/Prediction');
const User = require('../models/User');
const mongoose = require('mongoose');

const getCompetitionWeight = (competitorCount) => {
    if (competitorCount > 100) return 1.5;
    if (competitorCount > 20) return 1.0;
    return 0.5;
};

const getBaseRankBonus = (rank) => {
    if (rank === 1) return 100;
    if (rank <= 10) return 50;
    if (rank <= 50) return 10;
    if (rank <= 100) return 5;
    return 0;
};

const getLeaderboard = async (categoryQuery = {}) => {
    const matchQuery = { status: 'Assessed', ...categoryQuery };

    // --- FIX: Use $avg: '$rating' and $avg: '$score' to handle old data ---
    return await Prediction.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$userId',
                avgRating: { $avg: { $ifNull: ["$rating", "$score"] } }, // Use rating, fallback to score
                predictionCount: { $sum: 1 }
            }
        },
        {
            $match: {
                predictionCount: { $gt: 0 },
                avgRating: { $gte: 70 } // <-- ADD THIS LINE
            }
        },
        { $sort: { avgRating: -1 } }
    ]);
};

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

        // --- STRUCTURED LOGGING FOR WINNERS ---
        // Log the top 5 winners for visibility
        const top5 = top100.slice(0, 5);
        if (top5.length > 0) {
            console.log(`\n--- Top 5 Winners for '${categoryName}' ---`);
            for (const [i, winner] of top5.entries()) {
                try {
                    // Fetch the specific predictions that contributed to this score
                    // Note: This re-queries to get details, which is fine for just 5 users
                    const winnerPredictions = await Prediction.find({
                        userId: winner._id,
                        status: 'Assessed',
                        ...categoryQuery
                    }).select('stockTicker createdAt rating').lean();

                    const distinctStocks = [...new Set(winnerPredictions.map(p => p.stockTicker))];
                    const predictionCount = winnerPredictions.length;

                    console.log(`Rank #${i + 1}: User ${winner._id} (Avg: ${winner.avgRating.toFixed(2)})`);
                    console.log(`   - Stocks: ${distinctStocks.join(', ')}`);
                    console.log(`   - Count: ${predictionCount}`);
                    console.log(`   - Time Range: All Assessed in '${categoryName}' category`);
                } catch (err) {
                    console.error(`   - Error fetching details for winner ${winner._id}: ${err.message}`);
                }
            }
            console.log('-------------------------------------------\n');
        }
        // --- END STRUCTURED LOGGING ---

        if (updates.size === 0) {
            console.log(`Rank Job: No points to award for '${categoryName}'.`);
            return;
        }

        const bulkOps = [];
        for (const [userId, points] of updates.entries()) {
            const rankKey = categoryName.replace(/\./g, '_'); // Sanitize category name
            bulkOps.push({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(userId) },
                    // --- FIX: Use aggregate pipeline for safe, on-the-fly migration ---
                    update: [
                        {
                            $set: {
                                analystRating: {
                                    $cond: {
                                        if: { $or: [{ $not: ["$analystRating"] }, { $ne: [{ $type: "$analystRating" }, "object"] }] },
                                        then: {
                                            total: { $ifNull: ["$analystRating", 0] }, // Use old number if it exists
                                            fromPredictions: { $ifNull: ["$analystRating", 0] }, // Assume old points were from predictions
                                            fromBadges: 0, fromShares: 0, fromReferrals: 0, fromRanks: 0, fromBonus: 0,
                                            predictionBreakdownByStock: {}, badgeBreakdown: {}, rankBreakdown: {}, shareBreakdown: {}
                                        },
                                        else: "$analystRating"
                                    }
                                }
                            }
                        },
                        {
                            $set: {
                                "analystRating.total": { $add: ["$analystRating.total", points] },
                                "analystRating.fromRanks": { $add: ["$analystRating.fromRanks", points] },
                                // --- NEW: Update rankBreakdown ---
                                "analystRating.rankBreakdown": {
                                    $mergeObjects: [ // Use $mergeObjects to safely add/update keys in the map
                                        { $ifNull: ["$analystRating.rankBreakdown", {}] }, // Default to empty object if map doesn't exist
                                        { [rankKey]: { $add: [{ $ifNull: [`$analystRating.rankBreakdown.${rankKey}`, 0] }, points] } }
                                    ]
                                }
                                // --- END NEW ---
                            }
                        }
                    ]
                }
            });
            // --- END FIX ---
        }

        if (bulkOps.length > 0) {
            await User.bulkWrite(bulkOps);
        }
        console.log(`Rank Job: Awarded points to ${updates.size} users for '${categoryName}' leaderboard.`);

    } catch (err) {
        console.error(`Rank Job: Error processing '${categoryName}': ${err.message}`);
    }
};

module.exports = { awardPointsForCategory, getLeaderboard };