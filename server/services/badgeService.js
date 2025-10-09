// server/services/badgeService.js

// FIX: Changed all 'import' statements to 'require' for consistency
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

    const predictions = await Prediction.find({ userId: user._id, status: 'Assessed' });

    if (predictions.length === 0) {
        console.log(`No assessed predictions for ${user.username}. Skipping badge check.`);
        return;
    }

    const totalScore = predictions.reduce((sum, p) => sum + p.score, 0);
    const overallAccuracy = totalScore / predictions.length;

    const statsByType = predictions.reduce((acc, p) => {
        if (!acc[p.predictionType]) acc[p.predictionType] = { totalScore: 0, count: 0 };
        acc[p.predictionType].totalScore += p.score;
        acc[p.predictionType].count++;
        return acc;
    }, {});

    const fullStats = {
        overall: {
            avgScore: overallAccuracy,
            count: predictions.length,
        },
        byType: {},
    };

    for (const type in statsByType) {
        fullStats.byType[type] = {
            avgScore: statsByType[type].totalScore / statsByType[type].count,
            count: statsByType[type].count,
        };
    }
    
    console.log(`\n--- Checking badges for user: ${user.username} ---`);

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
        
        if (statsToCheck && statsToCheck.count >= (definition.minPredictions || 0)) {
            let earnedTier = null;
            if (statsToCheck.avgScore >= (definition.tiers.Gold?.score || 101)) earnedTier = 'Gold';
            else if (statsToCheck.avgScore >= (definition.tiers.Silver?.score || 101)) earnedTier = 'Silver';
            else if (statsToCheck.avgScore >= (definition.tiers.Bronze?.score || 101)) earnedTier = 'Bronze';

            console.log(` -> Checking for '${badgeId}': ${earnedTier ? `Earned ${earnedTier} tier.` : 'Criteria not met.'}`);
            
            if (earnedTier) {
                const existingTier = existingBadges.get(badgeId);
                if (!existingTier || (earnedTier === 'Gold' && existingTier !== 'Gold') || (earnedTier === 'Silver' && existingTier === 'Bronze')) {
                    user.badges = user.badges.filter(b => b.badgeId !== badgeId);
                    user.badges.push({ badgeId, tier: earnedTier });
                    earnedBadges.push({ badgeId, tier: earnedTier });
                    console.log(`   ==> AWARDING new/upgraded badge: ${definition.name} (${earnedTier})`);
                }
            }
        }
    }

    if (earnedBadges.length > 0) {
        await user.save(); 

        for (const badge of earnedBadges) {
            const badgeInfo = badgeDefinitions[badge.badgeId];
            if (!badgeInfo) continue;

            const message = `Congratulations! You've earned the ${badge.tier} ${badgeInfo.name} badge.`;
            const followerMessage = `${user.username} has earned the ${badge.tier} ${badgeInfo.name} badge!`;
            
            await new Notification({ recipient: user._id, type: 'BadgeEarned', message, link: `/profile/${user._id}` }).save();
            const followerNotifs = user.followers.map(followerId => ({
                recipient: followerId, sender: user._id, type: 'BadgeEarned', message: followerMessage, link: `/profile/${user._id}`
            }));
            if (followerNotifs.length > 0) {
                await Notification.insertMany(followerNotifs);
            }
        }
    } else {
        console.log(` -> No new badges earned for ${user.username}.`);
    }
};

// FIX: Use module.exports to match the rest of the backend project
module.exports = { awardBadges };