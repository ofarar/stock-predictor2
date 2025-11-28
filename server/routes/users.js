const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Prediction = require('../models/Prediction');
const Setting = require('../models/Setting');
const Post = require('../models/Post');
const { sendContactFormEmail, sendWelcomeEmail, sendGoldenActivationEmail, sendGoldenDeactivationEmail, sendPriceChangeEmail } = require('../services/email');
const xss = require('xss');
const rateLimit = require('express-rate-limit');
const { createOrUpdateStripePriceForUser } = require('./stripe');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const financeAPI = require('../services/financeAPI');
const {
    CONTACT_LIMIT, CONTACT_WINDOW_MS,
    VIEW_LIMIT, VIEW_WINDOW_MS,
    ACTION_LIMIT, ACTION_WINDOW_MS
} = require('../constants'); // <-- NEW IMPORT

// Limiters
const contactLimiter = rateLimit({
    windowMs: CONTACT_WINDOW_MS, // 1 hour
    max: CONTACT_LIMIT,
    message: 'Too many contact form submissions from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});

const actionLimiter = rateLimit({
    windowMs: ACTION_WINDOW_MS, // 15 minutes
    max: ACTION_LIMIT,
    message: 'Too many actions, please try again later.',
});

const viewLimiter = rateLimit({
    windowMs: VIEW_WINDOW_MS, // 1 hour
    max: VIEW_LIMIT,
    message: 'Too many requests.',
});

// POST: Contact form
router.post('/contact', contactLimiter, async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    if (message.length > 5000) {
        return res.status(400).json({ message: 'Message is too long. Please limit it to 5000 characters.' });
    }

    try {
        const sanitizedMessage = xss(message);
        await sendContactFormEmail(name, email, sanitizedMessage);
        res.status(200).json({ message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ message: 'Failed to send message.' });
    }
});

// POST: View user profile
router.post('/users/:id/view', viewLimiter, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { $inc: { profileViews: 1 } }).exec();
        res.status(200).send();
    } catch (err) {
        res.status(200).send();
    }
});

// POST: Mark creator pool animation as seen
router.post('/users/mark-creator-pool-seen', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');
    try {
        await User.findByIdAndUpdate(req.user._id, { hasSeenCreatorPoolAnimation: true });
        res.status(200).send();
    } catch (err) {
        res.status(500).send();
    }
});

// GET: Get a user's profile by ID
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('followers', 'username avatar')
            .populate('following', 'username avatar')
            .populate('goldenSubscribers', 'username avatar')
            .populate('goldenSubscriptions.user', 'username avatar');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate extra stats if needed, or just return the user
        // For the profile page, we usually need prediction counts, etc.
        // But for now, let's return the user object as the frontend likely expects.

        // We might need to calculate the 'rank' or other dynamic properties here
        // if they aren't stored directly on the user document.

        const userObj = user.toObject();

        // Get prediction count
        const predictionCount = await Prediction.countDocuments({ userId: user._id });
        userObj.predictionCount = predictionCount;

        res.json(userObj);
    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET: Pending profile
router.get('/pending-profile', (req, res) => {
    if (req.session.pendingProfile) {
        res.json(req.session.pendingProfile);
    } else {
        res.status(404).json({ message: 'No pending profile found.' });
    }
});

// POST: Complete registration
router.post('/complete-registration', async (req, res) => {
    if (!req.session.pendingProfile) {
        return res.status(400).json({ success: false, message: 'No pending registration found.' });
    }

    const { username } = req.body;
    const { googleId, email, avatar } = req.session.pendingProfile;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'This username is already taken. Please choose another.' });
        }

        const newUser = await new User({
            googleId,
            username,
            email,
            avatar
        }).save();

        delete req.session.pendingProfile;

        req.logIn(newUser, (err) => {
            if (err) {
                console.error('Error logging in after registration:', err);
                return res.status(500).json({ success: false, message: 'Login failed after registration.' });
            }
            sendWelcomeEmail(newUser.email, newUser.username);
            return res.json({ success: true });
        });

    } catch (error) {
        console.error('Error completing registration:', error);
        res.status(500).json({ success: false, message: 'An internal error occurred.' });
    }
});

// POST: Verify profile
router.post('/profile/verify', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated.' });
    }
    try {
        const settings = await Setting.findOne();
        if (!settings || !settings.isVerificationEnabled) {
            return res.status(403).json({ message: 'This feature is currently disabled.' });
        }

        await User.findByIdAndUpdate(req.user.id, { isVerified: true });
        res.status(200).json({ message: 'User verified successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating verification status.' });
    }
});

// POST: Cancel verification
router.post('/profile/cancel-verification', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated.' });
    }
    try {
        await User.findByIdAndUpdate(req.user.id, { isVerified: false });
        res.status(200).json({ message: 'User verification has been removed.' });
    } catch (err) {
        res.status(500).json({ message: 'Error removing verification status.' });
    }
});

// GET: My subscriptions
router.get('/my-subscriptions', async (req, res) => {
    if (!req.user) return res.status(401).json([]);
    try {
        const currentUser = await User.findById(req.user._id)
            .populate({
                path: 'goldenSubscriptions',
                populate: {
                    path: 'user',
                    select: 'username'
                }
            });
        res.json(currentUser.goldenSubscriptions);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching subscriptions.' });
    }
});

// GET: Profile details
router.get('/profile/:userId', async (req, res) => {
    try {
        const isOwnProfile = req.user ? req.user.id === req.params.userId : false;
        // Find the user and explicitly select the new Stripe fields.
        const user = await User.findById(req.params.userId)
            .select('-googleId')
            // --- ADD THESE NEW FIELDS TO THE SELECTION ---
            .select('stripeConnectRestrictions stripeConnectPendingFields')
            // ---------------------------------------------
            .exec(); // Execute the query

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Note: Watchlist quotes fetching removed from here to keep it simple. 
        // The frontend usually fetches quotes separately or we can add it back if strictly needed.
        // For now, let's keep the user logic focused.

        await user.populate(['goldenSubscriptions.user', 'goldenSubscribers.user']);

        const predictionsData = await Prediction.find({ userId: req.params.userId }).sort({ createdAt: -1 }).lean();
        const predictions = predictionsData.map(p => {
            if (p.score !== undefined) {
                p.rating = p.score;
                delete p.score;
            }
            return p;
        });
        const assessedPredictions = predictions.filter(p => p.status === 'Assessed');

        const overallRank = (await User.countDocuments({ avgRating: { $gt: user.avgRating } })) + 1;

        const performance = {
            overallRank: overallRank,
            overallAvgRating: Math.round(user.avgRating * 10) / 10,
        };

        const getGlobalRank = async (field, value, userRating) => {
            const matchStage = { status: 'Assessed' };
            if (field && value) {
                matchStage[field] = value;
            }
            const rankData = await Prediction.aggregate([
                { $match: matchStage },
                { $group: { _id: '$userId', avgRating: { $avg: { $ifNull: ["$rating", "$score"] } } } },
                { $match: { avgRating: { $gt: userRating } } },
                { $count: 'higherRankedUsers' }
            ]);
            return (rankData[0]?.higherRankedUsers || 0) + 1;
        };

        const thresholds = {
            Hourly: { def: 1, neu: 3 },
            Daily: { def: 3, neu: 7 },
            Weekly: { def: 5, neu: 10 },
            Monthly: { def: 8, neu: 20 },
            Quarterly: { def: 10, neu: 25 },
            Yearly: { def: 15, neu: 35 }
        };

        const perfByType = assessedPredictions.reduce((acc, p) => {
            if (!acc[p.predictionType]) {
                acc[p.predictionType] = { totalRating: 0, count: 0, defensive: 0, neutral: 0, offensive: 0 };
            }
            acc[p.predictionType].totalRating += p.rating;
            acc[p.predictionType].count++;

            if (p.priceAtCreation > 0) {
                const absoluteChange = Math.abs((p.targetPrice - p.priceAtCreation) / p.priceAtCreation) * 100;
                const typeThresholds = thresholds[p.predictionType] || { def: 5, neu: 15 };
                if (absoluteChange <= typeThresholds.def) acc[p.predictionType].defensive++;
                else if (absoluteChange <= typeThresholds.neu) acc[p.predictionType].neutral++;
                else acc[p.predictionType].offensive++;
            }
            return acc;
        }, {});

        const formattedPerfByType = Object.entries(perfByType).map(([type, data]) => {
            const total = data.defensive + data.neutral + data.offensive;
            const weightedTotal = (data.neutral * 50) + (data.offensive * 100);
            const aggressivenessScore = total > 0 ? weightedTotal / total : 0;
            return {
                type,
                avgRating: data.totalRating / data.count,
                count: data.count,
                aggressivenessScore
            };
        }).sort((a, b) => b.avgRating - a.avgRating);

        const perfByStock = assessedPredictions.reduce((acc, p) => {
            if (!acc[p.stockTicker]) {
                acc[p.stockTicker] = { totalRating: 0, count: 0, defensive: 0, neutral: 0, offensive: 0 };
            }
            acc[p.stockTicker].totalRating += p.rating;
            acc[p.stockTicker].count++;

            if (p.priceAtCreation > 0) {
                const absoluteChange = Math.abs((p.targetPrice - p.priceAtCreation) / p.priceAtCreation) * 100;
                const typeThresholds = thresholds['Weekly'];
                if (absoluteChange <= typeThresholds.def) acc[p.stockTicker].defensive++;
                else if (absoluteChange <= typeThresholds.neu) acc[p.stockTicker].neutral++;
                else acc[p.stockTicker].offensive++;
            }
            return acc;
        }, {});

        const formattedPerfByStock = Object.entries(perfByStock).map(([ticker, data]) => {
            const total = data.defensive + data.neutral + data.offensive;
            const weightedTotal = (data.neutral * 50) + (data.offensive * 100);
            const aggressivenessScore = total > 0 ? weightedTotal / total : 0;
            return {
                ticker,
                avgRating: data.totalRating / data.count,
                count: data.count,
                aggressivenessScore
            };
        }).sort((a, b) => b.avgRating - a.avgRating);

        const aggressivenessData = { defensive: 0, neutral: 0, offensive: 0 };
        let totalAbsoluteChange = 0;
        let analyzedCount = 0;

        assessedPredictions.forEach(p => {
            if (p.priceAtCreation > 0) {
                analyzedCount++;
                const absoluteChange = Math.abs((p.targetPrice - p.priceAtCreation) / p.priceAtCreation) * 100;
                totalAbsoluteChange += absoluteChange;

                const typeThresholds = thresholds[p.predictionType] || { def: 5, neu: 15 };

                if (absoluteChange <= typeThresholds.def) {
                    aggressivenessData.defensive++;
                } else if (absoluteChange <= typeThresholds.neu) {
                    aggressivenessData.neutral++;
                } else {
                    aggressivenessData.offensive++;
                }
            }
        });

        const overallAggressiveness = analyzedCount > 0 ? totalAbsoluteChange / analyzedCount : 0;

        performance.aggressiveness = {
            distribution: aggressivenessData,
            overallScore: parseFloat(overallAggressiveness.toFixed(1)),
            analyzedCount: analyzedCount
        };

        const rankPromisesByType = formattedPerfByType.map(p => getGlobalRank('predictionType', p.type, p.avgRating));
        const rankPromisesByStock = formattedPerfByStock.map(s => getGlobalRank('stockTicker', s.ticker, s.avgRating));
        const [resolvedRanksByType, resolvedRanksByStock] = await Promise.all([
            Promise.all(rankPromisesByType),
            Promise.all(rankPromisesByStock)
        ]);

        performance.byType = formattedPerfByType.map((p, index) => ({
            ...p,
            avgRating: Math.round(p.avgRating * 10) / 10,
            rank: resolvedRanksByType[index]
        }));
        performance.byStock = formattedPerfByStock.map((s, index) => ({
            ...s,
            avgRating: Math.round(s.avgRating * 10) / 10,
            rank: resolvedRanksByStock[index]
        }));

        const chartData = assessedPredictions.map(p => ({
            id: p._id, rating: p.rating, createdAt: p.createdAt, predictionType: p.predictionType, stockTicker: p.stockTicker
        }));

        const totalRatingResult = await User.aggregate([
            { $group: { _id: null, total: { $sum: "$analystRating.total" } } }
        ]);
        const totalAnalystRating = totalRatingResult[0]?.total || 1;

        const jsonResponse = {
            user,
            predictions,
            performance,
            chartData,
            followersCount: user.followers.length,
            followingCount: user.following.length,
            totalAnalystRating: totalAnalystRating
        };

        if (isOwnProfile) {
            const validSubscriptions = user.goldenSubscriptions.filter(sub => sub.user);
            const validSubscribers = user.goldenSubscribers.filter(sub => sub.user);
            jsonResponse.goldenSubscribersCount = validSubscribers.length;
            jsonResponse.goldenSubscriptionsCount = validSubscriptions.length;
        }

        res.json(jsonResponse);
    } catch (err) {
        console.error("Error fetching profile:", err);
        res.status(500).json({ message: "An internal server error occurred." });
    }
});

// PUT: Update profile
router.put('/profile', async (req, res) => {
    if (!req.user) {
        return res.status(401).send('You must be logged in.');
    }
    try {
        const { username, about, youtubeLink, xLink, avatar, telegramLink } = req.body;

        const sanitizedUpdate = {
            username: xss(username),
            about: xss(about),
            youtubeLink: xss(youtubeLink),
            xLink: xss(xLink),
            telegramLink: xss(telegramLink),
            avatar: xss(avatar)
        };

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            sanitizedUpdate,
            { new: true, runValidators: true }
        );
        res.json(updatedUser);
    } catch (err) {
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: 'Username cannot be empty.' });
        }
        console.error("Error in PUT /profile:", err);
        res.status(500).json({ message: 'Failed to update profile.' });
    }
});

// PUT: Golden Member settings
router.put('/profile/golden-member', async (req, res) => {
    if (!req.user) return res.status(401).send('You must be logged in.');

    try {
        const { isGoldenMember, price, description, acceptingNewSubscribers } = req.body;
        const userId = req.user._id;

        let userToUpdate = await User.findById(userId).populate('goldenSubscribers.user');
        if (!userToUpdate) return res.status(404).json({ message: "User not found." });

        const wasGoldenBefore = userToUpdate.isGoldenMember;

        if (wasGoldenBefore && isGoldenMember === false) {
            const validSubscribers = userToUpdate.goldenSubscribers.filter(sub => sub.user);
            const subscriberIds = validSubscribers.map(sub => sub.user._id);

            if (subscriberIds.length > 0) {
                await User.updateMany(
                    { _id: { $in: subscriberIds } },
                    { $pull: { goldenSubscriptions: { user: userId } } }
                );

                const oldPriceId = userToUpdate.goldenMemberPriceId;
                let subscriptions = { data: [] };
                if (oldPriceId) {
                    subscriptions = await stripe.subscriptions.list({
                        price: oldPriceId,
                        status: 'active'
                    });
                }

                for (const sub of subscriptions.data) {
                    try {
                        await stripe.subscriptions.cancel(sub.id);
                    } catch (err) {
                        console.error(`Failed to cancel subscription ${sub.id} for user ${userId} deactivation:`, err);
                    }
                }
            }

            let updateData = {
                isGoldenMember: false,
                goldenMemberPrice: price,
                goldenMemberDescription: description,
                acceptingNewSubscribers: acceptingNewSubscribers,
                goldenSubscribers: [],
                goldenMemberPriceId: null,
            };

            const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true });
            sendGoldenDeactivationEmail(updatedUser.email, updatedUser.username);
            return res.json(updatedUser);
        }

        if (isGoldenMember === true) {
            let updateData = {
                isGoldenMember: true,
                goldenMemberPrice: price,
                goldenMemberDescription: description,
                acceptingNewSubscribers: acceptingNewSubscribers,
            };

            if (userToUpdate.stripeConnectAccountId && userToUpdate.stripeConnectOnboardingComplete) {
                const oldPrice = userToUpdate.goldenMemberPrice;
                const newPrice = parseFloat(price);
                let newPriceId;

                if (wasGoldenBefore && newPrice !== oldPrice) {
                    const oldPriceId = userToUpdate.goldenMemberPriceId;
                    if (!oldPriceId) {
                        return res.status(500).json({ message: "Cannot update subscribers: Old Price ID not found." });
                    }

                    const subscriptions = await stripe.subscriptions.list({
                        price: oldPriceId,
                        status: 'active'
                    });

                    newPriceId = await createOrUpdateStripePriceForUser(userId, newPrice, userToUpdate.username);

                    for (const sub of subscriptions.data) {
                        const fullSub = await stripe.subscriptions.retrieve(sub.id);
                        const payingUserId = fullSub.metadata.payingUserId;

                        if (!payingUserId) continue;

                        const subscriber = await User.findById(payingUserId);
                        if (subscriber) {
                            const periodEndTimestamp = sub.current_period_end;
                            let effectiveDate = "an upcoming billing cycle";
                            if (typeof periodEndTimestamp === 'number') {
                                effectiveDate = new Date(periodEndTimestamp * 1000).toLocaleDateString(subscriber.language || 'en-US', {
                                    year: 'numeric', month: 'long', day: 'numeric'
                                });
                            }

                            sendPriceChangeEmail(subscriber.email, subscriber.username, userToUpdate.username, oldPrice, newPrice, effectiveDate);

                            await new Notification({
                                recipient: subscriber._id,
                                sender: userId,
                                type: 'PriceChange',
                                messageKey: 'notifications.priceChange',
                                link: '/profile/' + userId,
                                metadata: {
                                    creatorName: userToUpdate.username,
                                    oldPrice: oldPrice.toFixed(2),
                                    newPrice: newPrice.toFixed(2),
                                    effectiveDate: effectiveDate
                                }
                            }).save();

                            await stripe.subscriptions.update(sub.id, {
                                items: [{
                                    id: sub.items.data[0].id,
                                    price: newPriceId,
                                }],
                                proration_behavior: 'none'
                            });
                        }
                    }
                } else {
                    newPriceId = await createOrUpdateStripePriceForUser(userId, newPrice, userToUpdate.username);
                }

                updateData.goldenMemberPriceId = newPriceId;

            } else {
                updateData.goldenMemberPriceId = null;
            }

            const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true });

            if (!wasGoldenBefore && updatedUser.isGoldenMember) {
                sendGoldenActivationEmail(updatedUser.email, updatedUser.username);
            }

            return res.json(updatedUser);
        }

        return res.status(400).json({ message: "Invalid request data." });

    } catch (err) {
        if (err.name === 'ValidationError') {
            if (err.errors.goldenMemberPrice) {
                return res.status(400).json({ message: 'Price must be between $1 and $500.' });
            }
            return res.status(400).json({ message: err.message });
        }
        console.error("Error in PUT /profile/golden-member:", err);
        res.status(500).json({ message: 'Failed to update settings due to a server error.' });
    }
});

// POST: Follow user
router.post('/users/:userId/follow', actionLimiter, async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');

    const followedUserId = req.params.userId;
    const currentUserId = req.user._id;

    if (followedUserId === currentUserId.toString()) {
        return res.status(400).send("You cannot follow yourself.");
    }

    try {
        await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: followedUserId } });
        await User.findByIdAndUpdate(followedUserId, { $addToSet: { followers: currentUserId } });

        await new Notification({
            recipient: followedUserId,
            sender: currentUserId,
            type: 'NewFollower',
            messageKey: 'notifications.newFollower',
            link: `/profile/${currentUserId}`,
            metadata: {
                username: req.user.username
            }
        }).save();

        res.status(200).send('Successfully followed user.');
    } catch (error) {
        res.status(500).json({ message: 'Error following user.' });
    }
});

// POST: Unfollow user
router.post('/users/:userId/unfollow', actionLimiter, async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');

    const unfollowedUserId = req.params.userId;
    const currentUserId = req.user._id;

    try {
        await User.findByIdAndUpdate(currentUserId, { $pull: { following: unfollowedUserId } });
        await User.findByIdAndUpdate(unfollowedUserId, { $pull: { followers: currentUserId } });

        res.status(200).send('Successfully unfollowed user.');
    } catch (error) {
        res.status(500).json({ message: 'Error unfollowing user.' });
    }
});

// GET: Extended follow data
router.get('/users/:userId/follow-data-extended', async (req, res) => {
    try {
        const isOwnProfile = req.user ? req.user.id === req.params.userId : false;

        const user = await User.findById(req.params.userId)
            .populate('followers', 'username avatar isGoldenMember isVerified score createdAt')
            .populate('following', 'username avatar isGoldenMember isVerified score createdAt');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (isOwnProfile) {
            await user.populate({
                path: 'goldenSubscribers.user',
                select: 'username avatar isGoldenMember isVerified'
            });
            await user.populate({
                path: 'goldenSubscriptions.user',
                select: 'username avatar isGoldenMember isVerified'
            });
        }

        const getScoresForUserIds = async (userIds) => {
            if (userIds.length === 0) return new Map();
            const results = await Prediction.aggregate([
                { $match: { userId: { $in: userIds }, status: 'Assessed' } },
                { $group: { _id: '$userId', avgRating: { $avg: { $ifNull: ["$rating", "$score"] } } } }
            ]);
            return new Map(results.map(r => [r._id.toString(), r.avgRating]));
        };

        const allUserIds = [
            ...user.followers.map(u => u._id),
            ...user.following.map(u => u._id),
            ...(isOwnProfile ? user.goldenSubscribers.filter(sub => sub.user).map(sub => sub.user._id) : []),
            ...(isOwnProfile ? user.goldenSubscriptions.filter(sub => sub.user).map(sub => sub.user._id) : [])
        ];
        const uniqueUserIds = [...new Set(allUserIds)];
        const scoresMap = await getScoresForUserIds(uniqueUserIds);

        const combineUserDataWithScore = (userData) => ({
            ...userData.toObject(),
            avgRating: scoresMap.get(userData._id.toString()) || 0
        });

        res.json({
            profileUser: { username: user.username, isGoldenMember: user.isGoldenMember },
            followers: user.followers.map(combineUserDataWithScore),
            following: user.following.map(combineUserDataWithScore),
            goldenSubscribers: isOwnProfile ? user.goldenSubscribers
                .filter(sub => sub.user)
                .map(sub => ({
                    ...combineUserDataWithScore(sub.user),
                    subscribedAt: sub.subscribedAt
                })) : [],
            goldenSubscriptions: isOwnProfile ? user.goldenSubscriptions
                .filter(sub => sub.user)
                .map(sub => ({
                    ...combineUserDataWithScore(sub.user),
                    subscribedAt: sub.subscribedAt
                })) : []
        });
    } catch (err) {
        console.error("Error fetching extended follow data:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// POST: Join Golden
router.post('/users/:userId/join-golden', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');
    const goldenMemberId = req.params.userId;
    const currentUserId = req.user._id;

    try {
        const goldenMember = await User.findById(goldenMemberId);
        if (!goldenMember.isGoldenMember || !goldenMember.acceptingNewSubscribers) {
            return res.status(403).json({ message: 'This member is not accepting new subscribers.' });
        }
        await User.findByIdAndUpdate(goldenMemberId, { $addToSet: { goldenSubscribers: { user: currentUserId } } });
        await User.findByIdAndUpdate(currentUserId, { $addToSet: { goldenSubscriptions: { user: goldenMemberId } } });
        res.status(200).send('Successfully joined subscription.');
    } catch (error) {
        res.status(500).json({ message: 'Error joining subscription.' });
    }
});

// POST: Cancel Golden
router.post('/users/:userId/cancel-golden', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');
    const goldenMemberId = req.params.userId;
    const currentUserId = req.user._id;

    try {
        await User.findByIdAndUpdate(goldenMemberId, { $pull: { goldenSubscribers: currentUserId } });
        await User.findByIdAndUpdate(currentUserId, { $pull: { goldenSubscriptions: goldenMemberId } });

        res.status(200).send('Successfully canceled subscription.');
    } catch (error) {
        res.status(500).json({ message: 'Error canceling subscription.' });
    }
});

// GET: Leaderboard Rating
router.get('/leaderboard/rating', async (req, res) => {
    try {
        const users = await User.find({ 'analystRating.total': { $gt: 0 } })
            .sort({ 'analystRating.total': -1 })
            .limit(100)
            .select('username avatar analystRating');

        const totalRatingResult = await User.aggregate([
            { $group: { _id: null, total: { $sum: "$analystRating.total" } } }
        ]);
        const totalAnalystRating = totalRatingResult[0]?.total || 1;

        const leaderboardUsers = users.map(u => ({
            _id: u._id,
            username: u.username,
            avatar: u.avatar,
            analystRating: u.analystRating,
            ratingBreakdown: u.analystRating
        }));

        res.json({ users: leaderboardUsers, totalAnalystRating });
    } catch (err) {
        res.status(500).json({ message: "Error fetching rating leaderboard." });
    }
});

// PUT: Update watchlist (add/remove)
router.put('/watchlist', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated.' });
    }
    const { ticker, action } = req.body;

    if (!ticker || !['add', 'remove'].includes(action)) {
        return res.status(400).json({ message: 'Invalid request.' });
    }

    try {
        const update = action === 'add'
            ? { $addToSet: { watchlist: ticker } }
            : { $pull: { watchlist: ticker } };

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            update,
            { new: true }
        );

        res.json({ watchlist: updatedUser.watchlist });
    } catch (err) {
        console.error("Error updating watchlist:", err);
        res.status(500).json({ message: 'Error updating watchlist.' });
    }
});

// GET: Fetch user's watchlist with live data
// GET: Fetch user's watchlist with live data
router.get('/watchlist', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated.' });
    }

    try {
        const user = await User.findById(req.user._id);
        const watchlist = user.watchlist || [];

        if (watchlist.length === 0) {
            return res.json({ quotes: [], predictions: {}, recommendedUsers: {} });
        }

        // 1. Fetch live quotes
        const quotes = await financeAPI.getQuote(watchlist);

        // Map quotes to the format expected by the frontend
        const formattedQuotes = watchlist.map(ticker => {
            const quote = quotes.find(q => q.symbol === ticker);
            return {
                symbol: ticker,
                regularMarketPrice: quote ? quote.price : 0,
                regularMarketChange: quote ? quote.changeAbsolute : 0,
                regularMarketChangePercent: quote ? quote.changePercent : 0,
                shortname: quote ? quote.name : ticker,
                longname: quote ? quote.name : ticker
            };
        });

        // 2. Fetch active predictions and recommended users for each ticker
        const predictionsMap = {};
        const recommendedUsersMap = {};

        for (const ticker of watchlist) {
            // A. Fetch Predictions
            const predictions = await Prediction.find({
                stockTicker: ticker,
                status: 'Active',
                deadline: { $gt: new Date() }
            })
                .populate('userId', 'username avatar isGoldenMember isVerified')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();

            predictionsMap[ticker] = {
                items: predictions,
                totalPages: 1,
                currentPage: 1
            };

            // B. Fetch Recommended Users
            const predictors = await Prediction.aggregate([
                { $match: { stockTicker: ticker, status: 'Assessed' } },
                { $group: { _id: "$userId", count: { $sum: 1 }, avgScore: { $avg: "$score" } } },
                { $sort: { avgScore: -1 } },
                { $limit: 5 }
            ]);

            const predictorIds = predictors.map(p => p._id);

            const recommendedUsers = await User.find({
                _id: { $in: predictorIds, $ne: req.user._id }
            })
                .select('username avatar isGoldenMember isVerified avgRating goldenMemberPrice acceptingNewSubscribers')
                .lean();

            recommendedUsersMap[ticker] = recommendedUsers.map(u => ({
                ...u,
                avgRating: u.avgRating ? parseFloat(u.avgRating.toFixed(2)) : 0
            }));
        }

        res.json({
            quotes: formattedQuotes,
            predictions: predictionsMap,
            recommendedUsers: recommendedUsersMap
        });

    } catch (err) {
        console.error("Error fetching watchlist:", err);
        res.status(500).json({ message: 'Error fetching watchlist.' });
    }
});

// PUT: Update the order of a user's watchlist
router.put('/watchlist/order', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated.' });
    }
    const { tickers } = req.body;
    if (!Array.isArray(tickers)) {
        return res.status(400).json({ message: 'An array of tickers is required.' });
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { watchlist: tickers } }, // Overwrite the old list with the new, ordered one
            { new: true }
        );
        res.status(200).json({ watchlist: updatedUser.watchlist });
    } catch (err) {
        res.status(500).json({ message: 'Error saving new order.' });
    }
});

// PUT: Update language preference
router.put('/profile/language', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated.' });
    }
    const { language } = req.body;

    // Validate that the language is one of the supported codes
    if (!['en', 'tr', 'de', 'es', 'zh', 'ru', 'fr', 'nl', 'ar', 'hi'].includes(language)) {
        return res.status(400).json({ message: 'Unsupported language.' });
    }

    try {
        await User.findByIdAndUpdate(req.user.id, { language: language });
        res.status(200).json({ message: 'Language updated successfully.' });
    } catch (err) {
        console.error("Error saving language preference:", err);
        res.status(500).json({ message: 'Error updating language.' });
    }
});

// POST: Recommendation Wizard Endpoint
router.post('/golden-members/recommend', async (req, res) => {
    if (!req.user) { // Add a guard clause for safety
        return res.status(401).json({ message: 'Authentication required.' });
    }
    try {
        const { stocks, riskTolerance, investmentHorizon } = req.body;

        // Fetch the full user object to get subscription data
        const currentUser = await User.findById(req.user.id);
        const currentUserSubscriptions = currentUser.goldenSubscriptions.map(sub => sub.user);

        // 1. Find all potential Golden Members
        const goldenMembers = await User.find({
            _id: {
                $ne: req.user._id, // Exclude the current user
                $nin: currentUserSubscriptions // Exclude users they already subscribe to
            },
            isGoldenMember: true,
            acceptingNewSubscribers: true
        }).lean();

        // 2. Fetch prediction data for scoring
        const memberIds = goldenMembers.map(m => m._id);
        const predictions = await Prediction.find({
            userId: { $in: memberIds },
            status: 'Assessed' // Only score based on past performance
        }).select('userId stockTicker predictionType aggressivenessScore').lean();

        const predictionsByMember = predictions.reduce((acc, p) => {
            const userId = p.userId.toString();
            if (!acc[userId]) {
                acc[userId] = [];
            }
            acc[userId].push(p);
            return acc;
        }, {});

        // 3. Calculate match score for each member
        const scoredMembers = goldenMembers.map(member => {
            let score = 0;
            const memberPredictions = predictionsByMember[member._id.toString()] || [];
            let maxScore = 50 + 100; // Max possible from risk and horizon

            // Stock Match Score
            if (stocks && stocks.length > 0) {
                const stockMatches = memberPredictions.filter(p => stocks.includes(p.stockTicker)).length;
                score += stockMatches * 10; // 10 points per matching prediction
                maxScore += stocks.length * 10; // Adjust max score based on potential
            } else {
                score += 10; // Small bonus for skipping
            }

            // Risk Tolerance Score
            const memberAvgAggressiveness = member.aggressiveness?.value || 50; // Default to neutral
            const riskMap = { 'Defensive': 25, 'Neutral': 50, 'Offensive': 75 };
            const targetRisk = riskMap[riskTolerance] || 50;
            const riskDifference = Math.abs(memberAvgAggressiveness - targetRisk);
            score += Math.max(0, 50 - riskDifference); // Max 50 points for risk match

            // Investment Horizon Score
            if (investmentHorizon !== 'All' && memberPredictions.length > 0) {
                const shortTermTypes = ['Hourly', 'Daily', 'Weekly'];
                const isShortTarget = investmentHorizon === 'Short';

                const horizonMatches = memberPredictions.filter(p => {
                    const isShortPrediction = shortTermTypes.includes(p.predictionType);
                    return isShortTarget ? isShortPrediction : !isShortPrediction;
                }).length;

                const matchPercentage = (horizonMatches / memberPredictions.length) * 100;
                score += matchPercentage; // Max 100 points
            } else {
                score += 50; // Neutral score if 'All' or no predictions
            }

            // Verification Bonus
            if (member.isVerified) {
                score *= 1.5; // 50% score bonus for being verified
            }

            const matchPercentage = maxScore > 0 ? Math.min(100, Math.round((score / maxScore) * 100)) : 0;

            return { ...member, score, matchPercentage };
        });

        // 4. Sort and return top 6
        const recommended = scoredMembers
            .sort((a, b) => b.score - a.score)
            .slice(0, 6);

        res.json(recommended);

    } catch (error) {
        console.error('Recommendation error:', error);
        res.status(500).json({ message: "find_member_wizard.error_recommendations_generic" });
    }
});

// POST: Verify profile
router.post('/profile/verify', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated.' });
    }
    try {
        // --- NEW: Check if the feature is enabled by an admin ---
        const settings = await Setting.findOne();
        if (!settings || !settings.isVerificationEnabled) {
            return res.status(403).json({ message: 'This feature is currently disabled.' });
        }

        await User.findByIdAndUpdate(req.user.id, { isVerified: true });
        res.status(200).json({ message: 'User verified successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating verification status.' });
    }
});

// POST: Cancel verification
router.post('/profile/cancel-verification', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated.' });
    }
    try {
        await User.findByIdAndUpdate(req.user.id, { isVerified: false });
        res.status(200).json({ message: 'User verification has been removed.' });
    } catch (err) {
        res.status(500).json({ message: 'Error removing verification status.' });
    }
});

module.exports = router;
