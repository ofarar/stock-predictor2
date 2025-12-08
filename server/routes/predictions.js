const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Prediction = require('../models/Prediction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Setting = require('../models/Setting');
const financeAPI = require('../services/financeAPI');
const xss = require('xss');
const rateLimit = require('express-rate-limit');
const { getCommunitySentiment } = require('../utils/sentimentHelper');
const {
    PREDICT_LIMIT, PREDICT_WINDOW_MS,
    VIEW_LIMIT, VIEW_WINDOW_MS,
    ACTION_LIMIT, ACTION_WINDOW_MS
} = require('../constants');
const { v4: uuidv4 } = require('uuid');

const { sendPushToUser } = require('../services/pushNotificationService');

// --- DYNAMIC RATE LIMITER ---
// This limiter checks if a user is logged in and has a custom `rateLimitHourly`.
// If so, it uses that. Otherwise, it uses the global PREDICT_LIMIT.
const predictLimiter = rateLimit({
    windowMs: PREDICT_WINDOW_MS,
    max: (req) => {
        if (req.user && req.user.rateLimitHourly !== undefined && req.user.rateLimitHourly !== null) {
            return req.user.rateLimitHourly;
        }
        return PREDICT_LIMIT;
    },
    message: { message: "Information overload! Please wait an hour before making more predictions." },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
        // Rate limit by User ID if logged in, otherwise by IP using the safe helper
        if (req.user) {
            return req.user._id.toString();
        }
        return rateLimit.ipKeyGenerator(req, res);
    },
    // Don't skip for dev environments if we want to test this logic, OR skip if preferred.
    // Keeping existing skip logic if present before, but better to allow testing.
    skip: (req, res) => process.env.NODE_ENV === 'test' // Only skip in automated tests
});

const viewLimiter = rateLimit({
    windowMs: VIEW_WINDOW_MS, // 1 hour
    max: VIEW_LIMIT, // Limit each IP to 100 view requests per hour
    message: 'Too many requests.',
});

const actionLimiter = rateLimit({
    windowMs: ACTION_WINDOW_MS, // 15 minutes
    max: ACTION_LIMIT, // Max 200 "actions" (like/follow) per 15 min per IP
    message: 'Too many actions, please try again later.',
});

// GET: All predictions (with optional filters)
router.get('/predictions', async (req, res) => {
    try {
        const { status, stock, predictionType } = req.query;
        const query = {};
        if (status) query.status = status;
        if (stock) query.stockTicker = stock.toUpperCase();
        if (predictionType) query.predictionType = predictionType;

        const predictions = await Prediction.find(query).sort({ createdAt: -1 }).lean();
        res.json(predictions);
    } catch (err) {
        res.status(500).json({ message: "An internal server error occurred." });
    }
});

// POST: Create a new prediction
router.post('/predict', predictLimiter, async (req, res) => {
    if (!req.user) return res.status(401).send('You must be logged in.');

    try {
        const settings = await Setting.findOne();
        let user = await User.findById(req.user._id); // Fetch user initially

        const today = new Date().setHours(0, 0, 0, 0);
        const lastPredictionDay = user.lastPredictionDate ? new Date(user.lastPredictionDate).setHours(0, 0, 0, 0) : null;
        let dailyCountUpdate;

        // --- Daily Limit Check ---
        if (lastPredictionDay === today) {
            // Use custom limit if set, otherwise fallback to global setting
            const dailyLimit = (user.customPredictionLimit !== null && user.customPredictionLimit !== undefined)
                ? user.customPredictionLimit
                : settings.maxPredictionsPerDay;

            if (user.dailyPredictionCount >= dailyLimit) {
                return res.status(429).json({ message: 'Daily prediction limit reached.' });
            }
            dailyCountUpdate = { $inc: { dailyPredictionCount: 1 } };
        } else {
            dailyCountUpdate = { $set: { dailyPredictionCount: 1, lastPredictionDate: new Date() } };
        }
        user = await User.findByIdAndUpdate(req.user._id, dailyCountUpdate, { new: true }).populate('followers', 'notificationSettings');
        // --- End Daily Limit Check ---

        const { stockTicker, targetPrice, deadline, predictionType, description, maxRatingAtCreation } = req.body;
        const sanitizedDescription = xss(description);

        // --- Check for existing active prediction ---
        const existingPrediction = await Prediction.findOne({
            userId: req.user._id,
            stockTicker: stockTicker,
            predictionType: predictionType,
            status: 'Active'
        });

        if (existingPrediction) {
            return res.status(409).json({
                message: 'Duplicate prediction',
                errorKey: 'prediction.duplicateError',
                metadata: { type: predictionType, ticker: stockTicker }
            });
        }

        // --- Resilient Price Fetch ---
        let currentPrice = null;
        let currency = 'USD'; // Default currency
        let percentageChange = null;

        try {
            const quote = await financeAPI.getQuote(stockTicker);
            currentPrice = quote.regularMarketPrice;
            currency = quote.currency;
            if (currentPrice > 0) {
                percentageChange = ((targetPrice - currentPrice) / currentPrice) * 100;
            }
        } catch (financeApiError) {
            console.warn(`Predict API: Could not fetch price for ${stockTicker} at creation. Saving prediction without it. Error: ${financeApiError.message}`);
        }
        // --- End Resilient Price Fetch ---

        const prediction = new Prediction({
            userId: req.user._id,
            stockTicker,
            targetPrice,
            targetPriceAtCreation: targetPrice,
            deadline,
            predictionType,
            priceAtCreation: currentPrice, // Will be null if API failed
            currency: currency,
            description: sanitizedDescription,
            initialDescription: sanitizedDescription,
            status: 'Active',
            maxRatingAtCreation: maxRatingAtCreation || 100
        });
        await prediction.save();

        // --- REAL-TIME UPDATE ---
        const io = req.app.get('io');
        if (io) {
            const updatedSentiment = await getCommunitySentiment(stockTicker);
            io.to(stockTicker.toUpperCase()).emit('sentiment-update', updatedSentiment);
        }

        // --- Notification Logic ---
        const absPercentageChange = percentageChange !== null ? Math.abs(percentageChange) : 0;
        const thresholds = { Hourly: 3, Daily: 10, Weekly: 15, Monthly: 20, Quarterly: 40, Yearly: 100 };
        const isSignificant = percentageChange !== null && absPercentageChange > (thresholds[predictionType] || 999);
        const shortTermTypes = ['Hourly', 'Daily', 'Weekly'];
        const isShortTerm = shortTermTypes.includes(predictionType);

        const notifications = [];
        for (const follower of user.followers) {
            const settings = follower.notificationSettings;
            let shouldNotify = false;

            // --- MASTER SWITCH: Check Global Toggle First ---
            if (settings.newPrediction === false) {
                // User explicitly disabled this type
                shouldNotify = false;
            } else if (settings.allFollowedPredictions) {
                shouldNotify = true;
            } else if (isSignificant && settings.trustedShortTerm && isShortTerm) {
                shouldNotify = true;
            } else if (isSignificant && settings.trustedLongTerm && !isShortTerm) {
                shouldNotify = true;
            }

            if (shouldNotify) {
                notifications.push({
                    recipient: follower._id,
                    sender: user._id,
                    type: 'NewPrediction',
                    messageKey: 'notifications.newPrediction',
                    link: `/prediction/${prediction._id}`,
                    metadata: {
                        username: user.username,
                        stockTicker: stockTicker,
                        predictionType: predictionType,
                        ...(percentageChange !== null && { percentage: percentageChange })
                    }
                });

                // Send Push Notification
                const percentageString = percentageChange !== null ? ` (${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%)` : '';
                sendPushToUser(
                    follower._id,
                    "New Prediction",
                    `${user.username} made a ${predictionType} prediction on ${stockTicker}${percentageString}`,
                    { url: `/prediction/${prediction._id}` },
                    'newPrediction'
                );
            }
        }

        if (notifications.length > 0) await Notification.insertMany(notifications);

        res.status(201).json(prediction);
    } catch (err) {
        console.error("Critical prediction error:", err);
        res.status(400).json({ message: err.message });
    }
});

// GET: My predictions
router.get('/my-predictions', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'User not logged in' });
    }
    try {
        const predictions = await Prediction.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(predictions);
    } catch (err) {
        res.status(500).json({ message: "An internal server error occurred." });
    }
});

// GET: Single prediction details
router.get('/prediction/:id', async (req, res) => {
    try {
        const prediction = await Prediction.findById(req.params.id)
            .populate('userId', 'username avatar isGoldenMember isVerified isBot')
            .lean();

        if (!prediction) {
            return res.status(404).json({ message: "Prediction not found" });
        }

        let userId = req.user ? req.user._id.toString() : null;
        let guestId = req.cookies.guest_id;

        prediction.likeCount = (prediction.likes || []).length + (prediction.guestLikes || []).length;
        prediction.dislikeCount = (prediction.dislikes || []).length + (prediction.guestDislikes || []).length;
        prediction.userHasLiked = userId ? (prediction.likes || []).some(id => id.toString() === userId) : (prediction.guestLikes || []).includes(guestId);
        prediction.userHasDisliked = userId ? (prediction.dislikes || []).some(id => id.toString() === userId) : (prediction.guestDislikes || []).includes(guestId);

        res.json(prediction);
    } catch (err) {
        console.error("Error fetching prediction:", err);
        res.status(500).json({ message: "Error fetching prediction details" });
    }
});


// POST: Increment view count
router.post('/prediction/:id/view', viewLimiter, async (req, res) => {
    try {
        Prediction.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();
        res.status(202).send();
    } catch (err) {
        res.status(202).send();
    }
});

// GET: Explore feed (paginated predictions)
// GET: Explore feed (paginated predictions)
router.get('/explore/feed', async (req, res) => {
    const { status = 'Active', stock, predictionType, sortBy = 'date', verifiedOnly, page = 1, limit = 20 } = req.query;
    let userId = req.user ? req.user._id.toString() : null;
    let guestId = req.cookies.guest_id;

    if (!['Active', 'Assessed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status filter' });
    }

    try {
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const matchQuery = { status };
        if (stock) matchQuery.stockTicker = stock.toUpperCase();
        if (predictionType && predictionType !== 'All') matchQuery.predictionType = predictionType;

        let pipeline = [];
        if (verifiedOnly === 'true') {
            pipeline.push(
                { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userDetails' } },
                { $unwind: '$userDetails' },
                { $match: { 'userDetails.isVerified': true } }
            );
        }

        pipeline.push({ $match: matchQuery });

        const countPipeline = [...pipeline, { $count: 'total' }];
        const totalResult = await Prediction.aggregate(countPipeline);
        const totalItems = totalResult.length > 0 ? totalResult[0].total : 0;
        const totalPages = Math.ceil(totalItems / limitNum);

        if (sortBy === 'performance' || sortBy === 'votes') {
            let sortStage = {};
            if (sortBy === 'performance') {
                sortStage = { 'userDetails.totalRating': -1, createdAt: -1 };
            } else {
                sortStage = { voteScore: -1, createdAt: -1 };
            }
            if (verifiedOnly !== 'true') {
                pipeline.push(
                    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userDetails' } },
                    { $unwind: '$userDetails' }
                );
            }
            pipeline.push(
                { $addFields: { voteScore: { $subtract: [{ $add: [{ $size: { $ifNull: ["$likes", []] } }, { $size: { $ifNull: ["$guestLikes", []] } }] }, { $add: [{ $size: { $ifNull: ["$dislikes", []] } }, { $size: { $ifNull: ["$guestDislikes", []] } }] }] } } },
                { $sort: sortStage },
                { $skip: skip },
                { $limit: limitNum },
                {
                    $project: {
                        _id: 1, stockTicker: 1, targetPrice: 1, predictionType: 1, deadline: 1, status: 1,
                        rating: { $ifNull: ["$rating", "$score"] },
                        actualPrice: 1, createdAt: 1, description: 1, priceAtCreation: 1,
                        likes: 1, dislikes: 1, guestLikes: 1, guestDislikes: 1, // Include these
                        userId: {
                            _id: '$userDetails._id', username: '$userDetails.username', avatar: '$userDetails.avatar',
                            isGoldenMember: '$userDetails.isGoldenMember', totalRating: '$userDetails.totalRating', isVerified: '$userDetails.isVerified',
                            avgRating: '$userDetails.avgRating', isBot: '$userDetails.isBot'
                        }
                    }
                }
            );
            const predictions = await Prediction.aggregate(pipeline);

            // Post-process for like counts/stats
            const processed = predictions.map(p => {
                p.likeCount = (p.likes || []).length + (p.guestLikes || []).length;
                p.dislikeCount = (p.dislikes || []).length + (p.guestDislikes || []).length;
                p.userHasLiked = userId ? (p.likes || []).map(id => id.toString()).includes(userId) : (p.guestLikes || []).includes(guestId);
                p.userHasDisliked = userId ? (p.dislikes || []).map(id => id.toString()).includes(userId) : (p.guestDislikes || []).includes(guestId);
                return p;
            });

            return res.json({ predictions: processed, totalPages, currentPage: pageNum });
        } else {
            const initialPredictions = await Prediction.aggregate(pipeline.concat([{ $project: { _id: 1 } }]));
            const initialPredictionIds = initialPredictions.map(p => p._id);

            const predictions = await Prediction.find({ _id: { $in: initialPredictionIds } })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('userId', 'username avatar isGoldenMember totalRating isVerified avgRating isBot')
                .lean();

            const migratedPredictions = predictions.map(p => {
                if (p.score !== undefined) {
                    p.rating = p.score;
                    delete p.score;
                }

                p.likeCount = (p.likes || []).length + (p.guestLikes || []).length;
                p.dislikeCount = (p.dislikes || []).length + (p.guestDislikes || []).length;
                p.userHasLiked = userId ? (p.likes || []).map(id => id.toString()).includes(userId) : (p.guestLikes || []).includes(guestId);
                p.userHasDisliked = userId ? (p.dislikes || []).map(id => id.toString()).includes(userId) : (p.guestDislikes || []).includes(guestId);

                return p;
            });

            if (status === 'Active' && migratedPredictions.length > 0) {
                const tickers = [...new Set(migratedPredictions.map(p => p.stockTicker))];
                try {
                    if (tickers.length > 0) {
                        const quotes = await financeAPI.getQuote(tickers);
                        const priceMap = new Map(quotes.map(q => [q.symbol, q.price]));
                        migratedPredictions.forEach(p => {
                            p.currentPrice = priceMap.get(p.stockTicker) || 0;
                        });
                    }
                } catch (quoteError) {
                    console.error("Non-critical error: Failed to fetch live quotes for explore feed.", quoteError.message);
                    predictions.forEach(p => { p.currentPrice = 0; });
                }
            }
            return res.json({ predictions: migratedPredictions, totalPages, currentPage: pageNum });
        }
    } catch (err) {
        console.error(`CRITICAL Error fetching explore feed:`, err);
        res.status(500).json({ message: 'Server error fetching prediction data.' });
    }
});


// GET: Hourly winners widget
router.get('/widgets/hourly-winners', async (req, res) => {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const winners = await Prediction.find({
            status: 'Assessed',
            updatedAt: { $gte: oneHourAgo }
        })
            .sort({ rating: -1 })
            .limit(3)
            .populate('userId', 'username avatar isGoldenMember isVerified');

        const formattedWinners = winners.map(p => ({
            predictionId: p._id,
            userId: p.userId._id,
            username: p.userId.username,
            avatar: p.userId.avatar,
            isGoldenMember: p.userId.isGoldenMember,
            isVerified: p.userId.isVerified,
            ticker: p.stockTicker,
            rating: p.rating || p.score || 0.0
        }));

        res.json(formattedWinners);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching hourly winners' });
    }
});

// GET: Daily leaders widget
router.get('/widgets/daily-leaders', async (req, res) => {
    try {
        const startOfRollingDay = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const leaders = await Prediction.aggregate([
            { $match: { createdAt: { $gte: startOfRollingDay }, status: 'Assessed' } },
            { $group: { _id: '$userId', avgRating: { $avg: { $ifNull: ["$rating", "$score"] } } } },
            { $sort: { avgRating: -1 } },
            { $limit: 3 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            {
                $project: {
                    userId: '$_id',
                    username: '$user.username',
                    avgRating: { $round: ['$avgRating', 1] },
                    avatar: '$user.avatar',
                    isGoldenMember: '$user.isGoldenMember',
                    isVerified: '$user.isVerified',
                    _id: 0
                }
            }
        ]);
        res.json(leaders);
    } catch (err) { res.status(500).json({ message: 'Error fetching daily leaders' }); }
});

// GET: Long-term leaders widget
router.get('/widgets/long-term-leaders', async (req, res) => {
    try {
        const leaders = await Prediction.aggregate([
            { $match: { predictionType: { $in: ['Yearly', 'Quarterly'] }, status: 'Assessed' } },
            { $group: { _id: '$userId', avgRating: { $avg: { $ifNull: ["$rating", "$score"] } } } },
            { $sort: { avgRating: -1 } },
            { $limit: 3 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            {
                $project: {
                    userId: '$_id',
                    username: '$user.username',
                    avgRating: { $round: ['$avgRating', 1] },
                    avatar: '$user.avatar',
                    isGoldenMember: '$user.isGoldenMember',
                    isVerified: '$user.isVerified',
                    _id: 0
                }
            }
        ]);
        res.json(leaders);
    } catch (err) { res.status(500).json({ message: 'Error fetching long-term leaders' }); }
});

// GET: Community feed widget
router.get('/widgets/community-feed', async (req, res) => {
    try {
        const predictions = await Prediction.find({ status: 'Active' })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'username avatar isGoldenMember')
            .lean();

        const tickers = [...new Set(predictions.map(p => p.stockTicker))];
        const quotes = await financeAPI.getQuote(tickers);
        const priceMap = new Map(quotes.map(q => [q.symbol, q.regularMarketPrice]));

        const feed = predictions.map(p => {
            const currentPrice = priceMap.get(p.stockTicker) || 0;
            const targetPrice = p.targetPrice;

            let percentageChange = 0;
            if (currentPrice > 0) {
                percentageChange = ((targetPrice - currentPrice) / currentPrice) * 100;
            }
            const directionText = targetPrice >= currentPrice ? 'increase to' : 'decrease to';
            const formattedPercentage = `${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%`;

            return {
                id: p._id,
                text: `${p.userId.username} predicted ${p.stockTicker} will ${directionText} $${targetPrice.toFixed(2)}`,
                percentage: formattedPercentage,
                user: {
                    id: p.userId._id,
                    avatar: p.userId.avatar,
                    isGoldenMember: p.userId.isGoldenMember
                }
            };
        });
        res.json(feed);
    } catch (err) {
        console.error("Community feed error:", err);
        res.status(500).json({ message: 'Error fetching community feed' });
    }
});

// POST: Like a prediction
router.post('/predictions/:id/like', actionLimiter, async (req, res) => {
    try {
        const prediction = await Prediction.findById(req.params.id);
        if (!prediction) return res.status(404).send('Prediction not found.');

        let userId = req.user ? req.user._id.toString() : null;
        let guestId = req.cookies.guest_id;

        // If no user and no guest cookie, create one
        if (!userId && !guestId) {
            guestId = uuidv4();
            // Set cookie for 1 year
            res.cookie('guest_id', guestId, {
                maxAge: 365 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
            });
        }

        if (userId) {
            prediction.dislikes.pull(userId);
            if (prediction.likes.some(id => id.toString() === userId)) {
                prediction.likes.pull(userId);
            } else {
                prediction.likes.addToSet(userId);
            }
        } else {
            // Guest logic
            // Ensure array exists (schema default should handle this but just in case)
            if (!prediction.guestLikes) prediction.guestLikes = [];
            if (!prediction.guestDislikes) prediction.guestDislikes = [];

            // Remove from dislikes if present
            const dislikeIdx = prediction.guestDislikes.indexOf(guestId);
            if (dislikeIdx > -1) prediction.guestDislikes.splice(dislikeIdx, 1);

            // Toggle like
            const likeIdx = prediction.guestLikes.indexOf(guestId);
            if (likeIdx > -1) {
                prediction.guestLikes.splice(likeIdx, 1);
            } else {
                prediction.guestLikes.push(guestId);
            }
        }

        await prediction.save();

        // Return computed state for the requester
        const result = prediction.toObject();
        result.stats = {
            likes: (result.likes || []).length + (result.guestLikes || []).length,
            dislikes: (result.dislikes || []).length + (result.guestDislikes || []).length,
            userHasLiked: userId ? (result.likes || []).map(id => id.toString()).includes(userId) : (result.guestLikes || []).includes(guestId),
            userHasDisliked: userId ? (result.dislikes || []).map(id => id.toString()).includes(userId) : (result.guestDislikes || []).includes(guestId)
        };

        res.json(result);
    } catch (err) {
        console.error("Like error:", err);
        res.status(500).json({ message: 'Server error' });
    }
});


// POST: Dislike a prediction
router.post('/predictions/:id/dislike', actionLimiter, async (req, res) => {
    try {
        const prediction = await Prediction.findById(req.params.id);
        if (!prediction) return res.status(404).send('Prediction not found.');

        let userId = req.user ? req.user._id.toString() : null;
        let guestId = req.cookies.guest_id;

        // If no user and no guest cookie, create one
        if (!userId && !guestId) {
            guestId = uuidv4();
            res.cookie('guest_id', guestId, {
                maxAge: 365 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
            });
        }

        if (userId) {
            prediction.likes.pull(userId);
            if (prediction.dislikes.some(id => id.toString() === userId)) {
                prediction.dislikes.pull(userId);
            } else {
                prediction.dislikes.addToSet(userId);
            }
        } else {
            // Guest logic
            if (!prediction.guestLikes) prediction.guestLikes = [];
            if (!prediction.guestDislikes) prediction.guestDislikes = [];

            // Remove from likes if present
            const likeIdx = prediction.guestLikes.indexOf(guestId);
            if (likeIdx > -1) prediction.guestLikes.splice(likeIdx, 1);

            // Toggle dislike
            const dislikeIdx = prediction.guestDislikes.indexOf(guestId);
            if (dislikeIdx > -1) {
                prediction.guestDislikes.splice(dislikeIdx, 1);
            } else {
                prediction.guestDislikes.push(guestId);
            }
        }

        await prediction.save();

        const result = prediction.toObject();
        result.stats = {
            likes: (result.likes || []).length + (result.guestLikes || []).length,
            dislikes: (result.dislikes || []).length + (result.guestDislikes || []).length,
            userHasLiked: userId ? (result.likes || []).map(id => id.toString()).includes(userId) : (result.guestLikes || []).includes(guestId),
            userHasDisliked: userId ? (result.dislikes || []).map(id => id.toString()).includes(userId) : (result.guestDislikes || []).includes(guestId)
        };

        res.json(result);
    } catch (err) {
        console.error("Dislike error:", err);
        res.status(500).json({ message: 'Server error' });
    }
});


// GET: Scoreboard
router.get('/scoreboard', async (req, res) => {
    try {
        const { predictionType = 'Overall', stock = '', page = 1, limit = 20 } = req.query;

        const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limitNum = Math.min(parseInt(req.query.limit, 10) || 20, 50);
        const skip = (pageNum - 1) * limitNum;

        const predictionMatch = { status: 'Assessed' };
        if (predictionType !== 'Overall') {
            predictionMatch.predictionType = predictionType;
        }
        if (stock) {
            predictionMatch.stockTicker = stock.toUpperCase();
        }

        const basePipeline = [
            { $match: predictionMatch },
            {
                $group: {
                    _id: '$userId',
                    avgRating: { $avg: { $ifNull: ["$rating", "$score"] } },
                    predictionCount: { $sum: 1 }
                }
            },
            { $match: { predictionCount: { $gt: 0 } } }
        ];

        const countPipeline = [...basePipeline, { $count: 'total' }];
        const totalResult = await Prediction.aggregate(countPipeline);
        const totalItems = totalResult.length > 0 ? totalResult[0].total : 0;
        const totalPages = Math.ceil(totalItems / limitNum);

        const dataPipeline = [
            ...basePipeline,
            { $sort: { avgRating: -1 } },
            { $skip: skip },
            { $limit: limitNum },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $project: {
                    _id: '$userDetails._id',
                    username: '$userDetails.username',
                    avatar: '$userDetails.avatar',
                    isGoldenMember: '$userDetails.isGoldenMember',
                    isVerified: '$userDetails.isVerified',
                    avgRating: { $round: ['$avgRating', 1] },
                    predictionCount: 1,
                    acceptingNewSubscribers: '$user.acceptingNewSubscribers',
                    goldenMemberPrice: '$user.goldenMemberPrice'
                }
            }
        ];

        const topUsers = await Prediction.aggregate(dataPipeline);

        res.json({ users: topUsers, totalPages, currentPage: pageNum });
    } catch (err) {
        console.error("Scoreboard error:", err);
        res.status(500).json({ message: "An internal server error occurred." });
    }
});

// GET: Active predictions for a stock
router.get('/predictions/:ticker', async (req, res) => {
    try {
        const predictions = await Prediction.find({
            stockTicker: req.params.ticker.toUpperCase(),
            status: 'Active'
        }).sort({ createdAt: -1 }).populate('userId', 'username avatar isGoldenMember isVerified isBot');
        res.json(predictions);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching predictions.' });
    }
});

// GET: Top predictors for a stock
router.get('/stock/:ticker/top-predictors', async (req, res) => {
    const { ticker } = req.params;
    const { predictionType = 'Overall', page = 1, limit = 5 } = req.query;

    try {
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const matchQuery = { status: 'Assessed', stockTicker: ticker.toUpperCase() };
        if (predictionType !== 'Overall') {
            matchQuery.predictionType = predictionType;
        }

        const countPipeline = [{ $match: matchQuery }, { $group: { _id: '$userId' } }, { $count: 'total' }];
        const totalResult = await Prediction.aggregate(countPipeline);
        const totalItems = totalResult.length > 0 ? totalResult[0].total : 0;
        const totalPages = Math.ceil(totalItems / limitNum);

        const predictors = await Prediction.aggregate([
            { $match: matchQuery },
            { $group: { _id: '$userId', avgRating: { $avg: { $ifNull: ["$rating", "$score"] } } } },
            { $sort: { avgRating: -1 } },
            { $skip: skip },
            { $limit: limitNum },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userDetails' } },
            { $unwind: '$userDetails' },
            {
                $project: {
                    _id: '$userDetails._id',
                    username: '$userDetails.username',
                    avatar: '$userDetails.avatar',
                    isGoldenMember: '$userDetails.isGoldenMember',
                    isVerified: '$userDetails.isVerified',
                    avgRating: { $round: ['$avgRating', 1] }
                }
            }
        ]);

        res.json({ items: predictors, totalPages, currentPage: pageNum });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch top predictors" });
    }
});

// GET: Active predictions for a stock (Paginated)
router.get('/stock/:ticker/active-predictions', async (req, res) => {
    const { ticker } = req.params;
    const { page = 1, limit = 5 } = req.query;

    try {
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const query = { stockTicker: ticker.toUpperCase(), status: 'Active' };

        const totalItems = await Prediction.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limitNum);

        const predictions = await Prediction.find(query)
            .sort({ createdAt: -1 })
            .populate('userId', 'username avatar isGoldenMember isVerified isBot')
            .skip(skip)
            .limit(limitNum);

        res.json({ items: predictions, totalPages, currentPage: pageNum });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch active predictions" });
    }
});

// PUT: Edit a prediction
router.put('/predictions/:id/edit', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated.' });
    }

    const { newTargetPrice, reason } = req.body;
    if (!newTargetPrice || isNaN(newTargetPrice)) {
        return res.status(400).json({ message: 'A valid new target price is required.' });
    }

    try {
        const prediction = await Prediction.findById(req.params.id);

        if (!prediction) return res.status(404).json({ message: 'Prediction not found.' });
        if (prediction.userId.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized.' });
        if (prediction.status !== 'Active') return res.status(400).json({ message: 'Only active predictions can be edited.' });

        // --- Resilient Price Fetch for History ---
        let priceAtTimeOfUpdate = null; // Default to null
        try {
            // Attempt to fetch the current price
            const quote = await financeAPI.getQuote(prediction.stockTicker);
            priceAtTimeOfUpdate = quote.regularMarketPrice;
        } catch (financeApiError) {
            // Log the non-critical error but continue
            console.warn(`Edit Prediction: Could not fetch price for ${prediction.stockTicker} during edit. Error: ${financeApiError.message}`);
            // priceAtTimeOfUpdate remains null
        }
        // --- End of Resilient Logic ---

        const historyEntry = {
            previousTargetPrice: prediction.targetPrice,
            newTargetPrice: parseFloat(newTargetPrice),
            reason: reason || '',
            priceAtTimeOfUpdate: priceAtTimeOfUpdate // Will be null if API failed
        };

        prediction.history.push(historyEntry);
        prediction.targetPrice = parseFloat(newTargetPrice);
        if (reason) prediction.description = reason; // Update main description too

        await prediction.save();

        // --- START: REAL-TIME UPDATE ---
        const io = req.app.get('io');
        if (io) {
            const updatedSentiment = await getCommunitySentiment(prediction.stockTicker);
            io.to(prediction.stockTicker.toUpperCase()).emit('sentiment-update', updatedSentiment);
        }
        // --- END: REAL-TIME UPDATE ---

        res.json(prediction);

    } catch (err) {
        // This catch is now only for critical database errors
        console.error("Critical error editing prediction:", err);
        res.status(500).json({ message: 'Server error while editing prediction.' });
    }
});

// DELETE: Dev-only endpoint to delete a prediction (for testing)
router.delete('/dev/predictions', async (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: 'Forbidden' });
    }
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const { stockTicker } = req.body;
    if (!stockTicker) {
        return res.status(400).json({ message: 'Stock ticker required' });
    }

    try {
        await Prediction.deleteMany({
            userId: req.user._id,
            stockTicker: stockTicker.toUpperCase(),
            status: 'Active'
        });
        res.json({ message: 'Prediction deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting prediction' });
    }
});

router.post('/dev/clear-predictions', async (req, res) => {
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
        return res.status(403).json({ message: 'Forbidden' });
    }

    const { email } = req.body;

    try {
        let userId;
        if (email) {
            const user = await User.findOne({ email });
            if (user) userId = user._id;
        } else if (req.user) {
            userId = req.user._id;
        }

        if (!userId) {
            return res.status(400).json({ message: 'User not found or not specified' });
        }

        await Prediction.deleteMany({ userId });
        res.json({ message: 'All predictions cleared for user' });
    } catch (err) {
        console.error("Error clearing predictions:", err);
        res.status(500).json({ message: 'Error clearing predictions' });
    }
});

module.exports = router;
