// server/services/badgeService.js
// --- ENTIRE FILE REPLACEMENT ---

const User = require('../models/User');
const Notification = require('../models/Notification');
const Setting = require('../models/Setting');
const Prediction = require('../models/Prediction');

const awardBadges = async (user) => {
    const settings = await Setting.findOneAndUpdate({}, {}, { upsert: true, new: true });
    if (!settings.badgeSettings) {
        console.error("Badge settings not found in database.");
        return;
    }
    const badgeDefinitions = settings.badgeSettings;

    // --- FIX: Read old 'score' field and migrate to 'rating' ---
    const predictionsData = await Prediction.find({ userId: user._id, status: 'Assessed' }).lean();
    const predictions = predictionsData.map(p => {
        if (p.score !== undefined) {
            p.rating = p.score;
        }
        return p;
    });
    // --- END FIX ---

    if (predictions.length === 0) {
        console.log(`No assessed predictions for ${user.username}. Skipping badge check.`);
        return;
    }

    const totalRating = predictions.reduce((sum, p) => sum + (p.rating || 0), 0);
    const overallAvgRating = totalRating / predictions.length;

    const statsByType = predictions.reduce((acc, p) => {
        if (!acc[p.predictionType]) acc[p.predictionType] = { totalRating: 0, count: 0 };
        acc[p.predictionType].totalRating += (p.rating || 0);
        acc[p.predictionType].count++;
        return acc;
    }, {});

    const fullStats = {
        overall: {
            avgRating: overallAvgRating,
            count: predictions.length,
        },
        byType: {},
    };

    for (const type in statsByType) {
        fullStats.byType[type] = {
            avgRating: statsByType[type].totalRating / statsByType[type].count,
            count: statsByType[type].count,
        };
    }

    console.log(`\n--- Checking badges for user: ${user.username} ---`);

    // --- FIX: Initialize badges array if it's missing ---
    if (!user.badges) {
        user.badges = [];
    }
    // --- END FIX ---

    const existingBadges = new Map(user.badges.map(b => [b.badgeId, b.tier]));
    const earnedBadges = [];

    for (const badgeId in badgeDefinitions) {
        const definition = badgeDefinitions[badgeId];
        const badgeTypeKey = badgeId.split('_')[0].toLowerCase();
        const badgeType = badgeTypeKey.charAt(0).toUpperCase() + badgeTypeKey.slice(1);

        let statsToCheck = null;
        if (badgeId === 'market_maven') {
            statsToCheck = fullStats.overall;
        } else if (fullStats.byType[badgeType]) {
            statsToCheck = fullStats.byType[badgeType];
        }

        if (statsToCheck && statsToCheck.count >= (definition.minPredictions || 0) && statsToCheck.avgRating) {
            let earnedTier = null;
            // --- FIX: Check against 'rating' from settings ---
            if (statsToCheck.avgRating >= (definition.tiers.Gold?.rating || 101)) earnedTier = 'Gold';
            else if (statsToCheck.avgRating >= (definition.tiers.Silver?.rating || 101)) earnedTier = 'Silver';
            else if (statsToCheck.avgRating >= (definition.tiers.Bronze?.rating || 101)) earnedTier = 'Bronze';

            console.log(` -> Checking for '${badgeId}' (Avg Rating: ${statsToCheck.avgRating}): ${earnedTier ? `Earned ${earnedTier} tier.` : 'Criteria not met.'}`);

            if (earnedTier) {
                const existingTier = existingBadges.get(badgeId);
                if (!existingTier || (earnedTier === 'Gold' && existingTier !== 'Gold') || (earnedTier === 'Silver' && existingTier === 'Bronze')) {
                    if (typeof user.analystRating !== 'object' || user.analystRating === null) {
                        const oldPoints = typeof user.analystRating === 'number' ? user.analystRating : 0;
                        // --- FIX: On-the-fly migration for analystRating ---
                        user.analystRating = {
                            total: oldPoints, fromPredictions: oldPoints, fromBadges: 0, fromShares: 0, fromReferrals: 0, fromRanks: 0,
                            fromBonus: 0, predictionBreakdownByStock: {}, badgeBreakdown: {}, rankBreakdown: {}, shareBreakdown: {}
                        };
                        // --- END FIX ---

                        user.badges = user.badges.filter(b => b.badgeId !== badgeId);
                        user.badges.push({ badgeId, tier: earnedTier });
                        earnedBadges.push({ badgeId, tier: earnedTier });

                        // --- NEW RATING LOGIC ---
                        let ratingToAward = 0;
                        if (earnedTier === 'Bronze') ratingToAward = 100;
                        if (earnedTier === 'Silver') ratingToAward = 250;
                        if (earnedTier === 'Gold') ratingToAward = 500;

                        user.analystRating.total = (user.analystRating.total || 0) + ratingToAward;
                        user.analystRating.fromBadges = (user.analystRating.fromBadges || 0) + ratingToAward;
                        console.log(`   ==> AWARDING new/upgraded badge: ${definition.name} (${earnedTier}) and +${ratingToAward} Rating`);
                        // --- NEW: Update badgeBreakdown ---
                        const badgeKey = definition.name.replace(/\./g, '_');
                        if (!user.analystRating.badgeBreakdown) {
                            user.analystRating.badgeBreakdown = new Map();
                        }
                        const currentBadgeRating = user.analystRating.badgeBreakdown.get(badgeKey) || 0;
                        user.analystRating.badgeBreakdown.set(badgeKey, currentBadgeRating + ratingToAward);
                        // --- END NEW ---
                        // --- END NEW RATING LOGIC ---
                    }
                }
            }
        }
    }

    if (earnedBadges.length > 0) {
        await user.save(); // This now saves the new rating AND the badges

        for (const badge of earnedBadges) {
            const badgeInfo = badgeDefinitions[badge.badgeId];
            if (!badgeInfo) continue;

            await new Notification({
                recipient: user._id,
                type: 'BadgeEarned',
                messageKey: 'notifications.badgeEarnedSelf',
                link: `/profile/${user._id}`,
                metadata: {
                    tier: badge.tier,
                    badgeName: badgeInfo.name
                }
            }).save();

            // Notify followers
            if (user.followers && user.followers.length > 0) {
                const followerNotifs = user.followers.map(followerId => ({
                    recipient: followerId,
                    sender: user._id,
                    type: 'BadgeEarned', // Changed from 'FollowerBadgeEarned' to simplify
                    messageKey: 'notifications.badgeEarnedFollower',
                    link: `/profile/${user._id}`,
                    metadata: {
                        username: user.username,
                        tier: badge.tier,
                        badgeName: badgeInfo.name
                    }
                }));
                await Notification.insertMany(followerNotifs);
            }
        }
    } else {
        console.log(` -> No new badges earned for ${user.username}.`);
    }
};

module.exports = { awardBadges };