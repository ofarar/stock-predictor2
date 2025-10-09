// server/services/badgeService.js

const User = require('../models/User');
const Notification = require('../models/Notification');
const Setting = require('../models/Setting');

// Define the default badge rules here as a fallback
const defaultBadgeSettings = {
  "market_maven": {
    "name": "Market Maven",
    "description": "Awarded for achieving a high overall average score across all predictions.",
    "tiers": {
      "Gold": { "score": 90 },
      "Silver": { "score": 80 },
      "Bronze": { "score": 70 }
    }
  },
  "daily_oracle": {
    "name": "Daily Oracle",
    "description": "Awarded for high accuracy specifically on Daily predictions. Requires at least 20 daily predictions.",
    "tiers": {
      "Gold": { "score": 90 },
      "Silver": { "score": 80 },
      "Bronze": { "score": 70 }
    }
  }
};

const awardBadges = async (user, stats) => {
    // FIX: This logic is now more robust. It finds the settings, and if the badge rules
    // are missing, it adds them from the default configuration above.
    let settings = await Setting.findOne();
    if (!settings) {
        console.log("No settings document found. Creating one with default badge settings.");
        settings = await new Setting({ badgeSettings: defaultBadgeSettings }).save();
    } else if (!settings.badgeSettings || Object.keys(settings.badgeSettings).length === 0) {
        console.log("Found settings document but it's missing badge rules. Applying defaults.");
        settings.badgeSettings = defaultBadgeSettings;
        await settings.save();
    }
    const badgeDefinitions = settings.badgeSettings;

    console.log(`\n--- Checking badges for user: ${user.username} (Stats: Overall Score = ${stats.overallAccuracy.toFixed(2)}) ---`);
    const existingBadges = new Map(user.badges.map(b => [b.badgeId, b.tier]));
    const earnedBadges = [];

    for (const badgeId in badgeDefinitions) {
        const definition = badgeDefinitions[badgeId];
        
        const check = (stats) => {
            const score = stats.overallAccuracy;
            if (score >= (definition.tiers.Gold?.score || 101)) return 'Gold';
            if (score >= (definition.tiers.Silver?.score || 101)) return 'Silver';
            if (score >= (definition.tiers.Bronze?.score || 101)) return 'Bronze';
            return null;
        };
        const earnedTier = check(stats);
        console.log(` -> Checking for '${badgeId}': ${earnedTier ? `Earned ${earnedTier} tier.` : 'Criteria not met.'}`);

        if (earnedTier) {
            const existingTier = existingBadges.get(badgeId);
            if (!existingTier || (earnedTier === 'Gold' && existingTier !== 'Gold') || (earnedTier === 'Silver' && existingTier === 'Bronze')) {
                user.badges = user.badges.filter(b => b.badgeId !== badgeId);
                const newBadge = { badgeId, tier: earnedTier };
                user.badges.push(newBadge);
                earnedBadges.push(newBadge);
                console.log(`   ==> AWARDING new/upgraded badge: ${definition.name} (${earnedTier})`);
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

module.exports = { awardBadges };