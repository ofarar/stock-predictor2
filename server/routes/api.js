const express = require('express');
const router = express.Router();
const yahooFinance = require('yahoo-finance2').default;
const axios = require('axios'); // <-- Added for making API calls
const User = require('../models/User');
const Prediction = require('../models/Prediction');
const Notification = require('../models/Notification');
const Setting = require('../models/Setting'); // Import the new model
const { awardBadges } = require('../services/badgeService');
const Post = require('../models/Post');
const { sendContactFormEmail } = require('../services/email');

const searchCache = new Map();
// A simple in-memory cache to avoid spamming the Yahoo Finance API
const apiCache = new Map();

router.post('/quotes', async (req, res) => {
    const { tickers } = req.body;
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
        return res.status(400).json({ message: 'An array of tickers is required.' });
    }

    try {
        const quotes = await yahooFinance.quote(tickers);
        res.json(quotes);
    } catch (error) {
        console.error("Yahoo Finance multi-quote error:", error);
        res.status(500).json({ message: 'Error fetching stock quotes.' });
    }
});

router.get('/admin/all-users', async (req, res) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }

    try {
        const { sortBy = 'username', order = 'asc', isGoldenMember } = req.query;

        // Whitelist valid sort fields to prevent injection
        const validSortKeys = [
            'username', 'followersCount', 'predictionCount',
            'avgScore', 'goldenSubscribersCount', 'followingCount',
            'goldenSubscriptionsCount'
        ];

        const sortKey = validSortKeys.includes(sortBy) ? sortBy : 'username';
        const sortOrder = order === 'asc' ? 1 : -1;
        const sortQuery = { [sortKey]: sortOrder, username: 1 }; // Add username as a secondary sort

        // Build the initial match query (for categorical filters like 'isGoldenMember')
        const matchQuery = {};
        if (isGoldenMember === 'true') {
            matchQuery.isGoldenMember = true;
        }

        const usersWithStats = await User.aggregate([
            { $match: matchQuery },
            {
                $addFields: {
                    followersCount: { $size: { $ifNull: ["$followers", []] } },
                    followingCount: { $size: { $ifNull: ["$following", []] } },
                    goldenSubscribersCount: { $size: { $ifNull: ["$goldenSubscribers", []] } },
                    goldenSubscriptionsCount: { $size: { $ifNull: ["$goldenSubscriptions", []] } },
                }
            },
            {
                $lookup: { from: 'predictions', localField: '_id', foreignField: 'userId', as: 'predictions' }
            },
            {
                $addFields: {
                    predictionCount: { $size: "$predictions" },
                    avgScore: {
                        $cond: {
                            if: { $gt: [{ $size: "$predictions" }, 0] },
                            then: { $avg: "$predictions.score" },
                            else: 0
                        }
                    }
                }
            },
            {
                $project: {
                    username: 1, avatar: 1, isGoldenMember: 1,
                    followersCount: 1, followingCount: 1,
                    goldenSubscribersCount: 1, goldenSubscriptionsCount: 1,
                    predictionCount: 1,
                    avgScore: { $round: ["$avgScore", 1] }
                }
            },
            { $sort: sortQuery }
        ]);

        res.json(usersWithStats);
    } catch (err) {
        console.error("Error fetching all users for admin:", err);
        res.status(500).json({ message: 'Error fetching user data.' });
    }
});

// Add this route anywhere in the file
router.post('/contact', async (req, res) => {
    const { name, email, message } = req.body;

    // Basic validation
    if (!name || !email || !message) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        await sendContactFormEmail(name, email, message);
        res.status(200).json({ message: 'Message sent successfully!' });
    } catch (error) {
        console.error("Contact form submission error:", error);
        res.status(500).json({ message: 'Failed to send message. Please try again later.' });
    }
});

// GET: Data for the user's multi-stock watchlist page
router.get('/watchlist', async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const user = await User.findById(req.user._id);
        const tickers = user.watchlist;

        if (!tickers || tickers.length === 0) {
            return res.json({ quotes: [], predictions: {}, recommendedUsers: {} });
        }

        const quotes = await yahooFinance.quote(tickers);

        // Fetch predictions and recommended users for all watched stocks in parallel
        const dataPromises = tickers.map(ticker => (
            Promise.all([
                Prediction.find({ stockTicker: ticker, status: 'Active' })
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .populate('userId', 'username avatar isGoldenMember score'),
                Prediction.aggregate([
                    { $match: { status: 'Assessed', stockTicker: ticker } },
                    { $group: { _id: '$userId', avgScore: { $avg: '$score' } } },
                    { $sort: { avgScore: -1 } },
                    { $limit: 3 },
                    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                    { $unwind: '$user' },
                    { $project: { _id: '$user._id', username: '$user.username', avatar: '$user.avatar', avgScore: { $round: ['$avgScore', 1] } } }
                ])
            ])
        ));

        const results = await Promise.all(dataPromises);

        const predictions = {};
        const recommendedUsers = {};
        tickers.forEach((ticker, index) => {
            predictions[ticker] = results[index][0];
            recommendedUsers[ticker] = results[index][1];
        });

        res.json({ quotes, predictions, recommendedUsers });

    } catch (err) {
        console.error("Watchlist fetch error:", err);
        res.status(500).json({ message: 'Error fetching watchlist data.' });
    }
});

// PUT: Update the user's watchlist array
router.put('/watchlist', async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    const { ticker, action } = req.body; // action can be 'add' or 'remove'

    try {
        const update = action === 'add'
            ? { $addToSet: { watchlist: ticker } }
            : { $pull: { watchlist: ticker } };

        const updatedUser = await User.findByIdAndUpdate(req.user._id, update, { new: true });
        res.json({ watchlist: updatedUser.watchlist });
    } catch (err) {
        res.status(500).json({ message: 'Error updating watchlist.' });
    }
});

// PUT: Update notification settings
router.put('/notification-settings', async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    try {
        const user = await User.findById(req.user._id);
        user.notificationSettings = req.body;
        await user.save();
        res.json(user.notificationSettings);
    } catch (err) {
        res.status(500).json({ message: 'Error updating settings.' });
    }
});

// GET: A list of the current user's subscriptions (for the filter dropdown)
router.get('/my-subscriptions', async (req, res) => {
    if (!req.user) return res.status(401).json([]);
    try {
        const currentUser = await User.findById(req.user._id)
            .populate('goldenSubscriptions', 'username'); // Populate with id and username
        res.json(currentUser.goldenSubscriptions);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching subscriptions.' });
    }
});

// GET: The filterable, centralized Golden Feed
router.get('/golden-feed', async (req, res) => {
    if (!req.user) return res.status(401).json([]);

    try {
        const { authorId, stock, predictionType } = req.query;
        const currentUser = await User.findById(req.user._id);

        // Base list of authors: the user themselves plus anyone they subscribe to
        let authorIds = [currentUser._id, ...currentUser.goldenSubscriptions.map(sub => sub.user)];

        const query = { isGoldenPost: true };

        // If filtering by a specific author, override the base list
        if (authorId && authorId !== 'All') {
            query.userId = authorId;
        } else {
            query.userId = { $in: authorIds };
        }

        if (stock) {
            query['attachedPrediction.stockTicker'] = stock.toUpperCase();
        }
        if (predictionType && predictionType !== 'All') {
            query['attachedPrediction.predictionType'] = predictionType;
        }

        const feedPosts = await Post.find(query)
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('userId', 'username avatar isGoldenMember');

        res.json(feedPosts);
    } catch (err) {
        console.error("Error fetching golden feed:", err);
        res.status(500).json({ message: 'Error fetching golden feed.' });
    }
});

router.get('/golden-feed', async (req, res) => {
    if (!req.user) return res.status(401).json([]);

    try {
        // Find the current user and their subscriptions
        const currentUser = await User.findById(req.user._id);
        const subscribedToIds = currentUser.goldenSubscriptions;

        // Find all golden posts where the author is in the user's subscription list
        const feedPosts = await Post.find({
            userId: { $in: subscribedToIds },
            isGoldenPost: true
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('userId', 'username avatar isGoldenMember'); // Populate author info

        res.json(feedPosts);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching golden feed.' });
    }
});

router.get('/posts/golden/:userId', async (req, res) => {
    try {
        const profileUserId = req.params.userId;
        const profileUser = await User.findById(profileUserId);
        if (!profileUser) return res.status(404).json({ message: 'User not found.' });

        let isAllowed = false;
        if (req.user) {
            const currentUserId = req.user._id.toString();
            const isOwner = currentUserId === profileUserId;
            const isSubscriber = profileUser.goldenSubscribers.map(id => id.toString()).includes(currentUserId);
            if (isOwner || isSubscriber) {
                isAllowed = true;
            }
        }

        if (isAllowed) {
            const posts = await Post.find({ userId: profileUserId, isGoldenPost: true })
                .sort({ createdAt: -1 })
                .limit(50);
            // Return an object with the access flag and the posts
            return res.json({ isAllowed: true, posts: posts });
        } else {
            // If not allowed, still return the flag
            return res.json({ isAllowed: false, posts: [] });
        }
    } catch (err) {
        console.error("Error fetching golden feed:", err);
        res.status(500).json({ message: 'Server error while fetching feed.' });
    }
});

// GET: Fetch the golden feed for a specific user (with security)
router.get('/posts/golden/:userId', async (req, res) => {
    if (!req.user) {
        // Not logged in, return empty array to show the paywall
        return res.json([]);
    }

    try {
        const profileUserId = req.params.userId;
        const currentUserId = req.user._id.toString();

        const profileUser = await User.findById(profileUserId);
        if (!profileUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check for authorization:
        // 1. Is the current user the owner of the profile?
        // 2. Is the current user in the profile owner's list of golden subscribers?
        const isOwner = currentUserId === profileUserId;
        const isSubscriber = profileUser.goldenSubscribers.map(id => id.toString()).includes(currentUserId);

        if (isOwner || isSubscriber) {
            // If authorized, fetch and return the posts
            const posts = await Post.find({ userId: profileUserId, isGoldenPost: true })
                .sort({ createdAt: -1 })
                .limit(50);
            return res.json(posts);
        } else {
            // If not authorized, return an empty array to indicate they don't have access
            return res.json([]);
        }
    } catch (err) {
        console.error("Error fetching golden feed:", err);
        res.status(500).json({ message: 'Server error while fetching feed.' });
    }
});

// POST: Like a prediction
router.post('/predictions/:id/like', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');
    try {
        const prediction = await Prediction.findById(req.params.id);
        if (!prediction) return res.status(404).send('Prediction not found.');

        const userId = req.user._id.toString();
        // Remove from dislikes if it's there
        prediction.dislikes.pull(userId);

        // Toggle the like
        if (prediction.likes.includes(userId)) {
            prediction.likes.pull(userId); // Unlike
        } else {
            prediction.likes.addToSet(userId); // Like
        }
        await prediction.save();
        res.json(prediction);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST: Dislike a prediction
router.post('/predictions/:id/dislike', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');
    try {
        const prediction = await Prediction.findById(req.params.id);
        if (!prediction) return res.status(404).send('Prediction not found.');

        const userId = req.user._id.toString();
        // Remove from likes if it's there
        prediction.likes.pull(userId);

        // Toggle the dislike
        if (prediction.dislikes.includes(userId)) {
            prediction.dislikes.pull(userId); // Undislike
        } else {
            prediction.dislikes.addToSet(userId); // Dislike
        }
        await prediction.save();
        res.json(prediction);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ++ NEW ROUTE: Real-time Top Movers / Trending Stocks ++
router.get('/market/top-movers', async (req, res) => {
    const cacheKey = 'top-movers';
    if (apiCache.has(cacheKey) && (Date.now() - apiCache.get(cacheKey).timestamp < 15 * 60 * 1000)) {
        return res.json(apiCache.get(cacheKey).data);
    }

    try {
        const trending = await yahooFinance.trendingSymbols('US', { count: 6 });
        const tickers = trending.quotes.map(q => q.symbol);
        const quotes = await yahooFinance.quote(tickers);

        const movers = quotes.map(q => ({
            ticker: q.symbol,
            price: q.regularMarketPrice?.toFixed(2) || 'N/A',
            change: q.regularMarketChange?.toFixed(2) || 'N/A',
            percentChange: q.regularMarketChangePercent?.toFixed(2) || 'N/A',
            isUp: (q.regularMarketChange || 0) >= 0
        }));

        apiCache.set(cacheKey, { data: movers, timestamp: Date.now() });
        res.json(movers);
    } catch (err) {
        console.error("Top movers fetch error:", err);
        res.status(500).json({ message: "Failed to fetch market data." });
    }
});

router.get('/settings', async (req, res) => {
    try {
        // Define the default badge rules to be used if they don't exist
        const defaultBadgeSettings = {
            "market_maven": {
                "name": "Market Maven",
                "description": "Awarded for achieving a high overall average score across all predictions.",
                "tiers": { "Gold": { "score": 90 }, "Silver": { "score": 80 }, "Bronze": { "score": 70 } }
            },
            "daily_oracle": {
                "name": "Daily Oracle",
                "description": "Awarded for high accuracy specifically on Daily predictions.",
                "tiers": { "Gold": { "score": 90 }, "Silver": { "score": 80 }, "Bronze": { "score": 70 } }
            }
        };

        let settings = await Setting.findOne();

        // If no settings document exists at all, create one with the defaults.
        if (!settings) {
            console.log("No settings document found. Creating one with default badge settings.");
            settings = await new Setting({ badgeSettings: defaultBadgeSettings }).save();
        }
        // If the document exists but is MISSING the badgeSettings, add them and save.
        else if (!settings.badgeSettings || Object.keys(settings.badgeSettings).length === 0) {
            console.log("Found settings document but it's missing badge rules. Applying defaults.");
            settings.badgeSettings = defaultBadgeSettings;
            settings = await settings.save();
        }

        res.json(settings);
    } catch (err) {
        console.error("Error in GET /settings:", err);
        res.status(500).json({ message: 'Error fetching settings' });
    }
});


// PUT: An admin-only route to update settings
router.put('/settings/admin', async (req, res) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).send('Forbidden: Admins only.');
    }
    try {
        // FIX: This logic now dynamically builds the update object,
        // so it can save either the banner setting, the badge settings, or both.
        const updateData = {};
        if (req.body.isPromoBannerActive !== undefined) {
            updateData.isPromoBannerActive = req.body.isPromoBannerActive;
        }
        if (req.body.badgeSettings) {
            updateData.badgeSettings = req.body.badgeSettings;
        }

        const updatedSettings = await Setting.findOneAndUpdate({},
            { $set: updateData },
            { new: true, upsert: true }
        );
        res.json(updatedSettings);
    } catch (err) {
        console.error("Error updating settings:", err);
        res.status(400).json({ message: 'Error updating settings' });
    }
});

// ===================================
// Original Prediction & User Routes
// ===================================

// GET: Scoreboard Data (Top Users) - Timeframe logic removed
router.get('/scoreboard', async (req, res) => {
    try {
        // 'timeframe' is no longer expected from req.query
        const { predictionType = 'Overall', stock = '' } = req.query;

        const predictionMatch = { status: 'Assessed' };

        if (predictionType !== 'Overall') {
            predictionMatch.predictionType = predictionType;
        }
        if (stock) {
            predictionMatch.stockTicker = stock.toUpperCase();
        }

        // Timeframe filtering logic has been completely removed

        // The aggregation pipeline remains the same
        const topUsers = await Prediction.aggregate([
            { $match: predictionMatch },
            {
                $group: {
                    _id: '$userId',
                    avgScore: { $avg: '$score' },
                    predictionCount: { $sum: 1 }
                }
            },
            { $sort: { avgScore: -1 } },
            { $limit: 20 },
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
                    avgScore: { $round: ['$avgScore', 1] },
                    predictionCount: 1
                }
            }
        ]);

        res.json(topUsers);
    } catch (err) {
        console.error("Scoreboard error:", err);
        res.status(500).json({ message: err.message });
    }
});

// Get all active predictions for a stock
router.get('/predictions/:ticker', async (req, res) => {
    try {
        const predictions = await Prediction.find({
            stockTicker: req.params.ticker.toUpperCase(),
            status: 'Active'
        }).populate('userId', 'username'); // Show username instead of just ID
        res.json(predictions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// This route handles creating new predictions and sending notifications
// In server/routes/api.js, replace the entire POST '/predict' route

router.post('/predict', async (req, res) => {
    if (!req.user) return res.status(401).send('You must be logged in.');

    const { stockTicker, targetPrice, deadline, predictionType, description } = req.body;
    try {
        const quote = await yahooFinance.quote(stockTicker);
        const currentPrice = quote.regularMarketPrice;

        const prediction = new Prediction({
            userId: req.user._id,
            stockTicker,
            targetPrice,
            deadline,
            predictionType,
            priceAtCreation: currentPrice,
            description,
            status: 'Active'
        });
        await prediction.save();

        // --- START: NEW NOTIFICATION LOGIC ---
        const user = await User.findById(req.user._id).populate({
            path: 'followers',
            select: 'notificationSettings' // Only get the settings for followers
        });

        const percentageChange = ((targetPrice - currentPrice) / currentPrice) * 100;
        const absPercentageChange = Math.abs(percentageChange);

        // Define significance thresholds
        const thresholds = { Hourly: 3, Daily: 10, Weekly: 15, Monthly: 20, Quarterly: 40, Yearly: 100 };
        const isSignificant = absPercentageChange > (thresholds[predictionType] || 999);

        const shortTermTypes = ['Hourly', 'Daily', 'Weekly'];
        const isShortTerm = shortTermTypes.includes(predictionType);

        const mainMessage = `${user.username} predicted ${stockTicker} will move by ${percentageChange.toFixed(1)}%`;

        const notifications = [];
        for (const follower of user.followers) {
            const settings = follower.notificationSettings;
            let shouldNotify = false;

            if (settings.allFollowedPredictions) {
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
                    message: mainMessage,
                    link: `/prediction/${prediction._id}`
                });
            }
        }

        if (notifications.length > 0) await Notification.insertMany(notifications);
        // --- END: NEW NOTIFICATION LOGIC ---

        res.status(201).json(prediction);
    } catch (err) {
        console.error("Prediction error:", err);
        res.status(400).json({ message: err.message });
    }
});
// ===================================
// New Real-Time Data Proxy Routes
// ===================================

// Route for searching stock symbols
// --- NEW REAL-TIME DATA ROUTES (using Yahoo Finance) ---

// Route for searching stock symbols
router.get('/search/:keyword', async (req, res) => {
    const keyword = req.params.keyword.toLowerCase();

    if (searchCache.has(keyword)) {
        const cacheEntry = searchCache.get(keyword);
        if (Date.now() - cacheEntry.timestamp < 3600000) {
            console.log(`Serving search for "${keyword}" from cache.`);
            return res.json(cacheEntry.data);
        }
    }

    console.log(`Fetching search for "${keyword}" from Yahoo Finance.`);
    try {
        const searchResults = await yahooFinance.search(keyword);

        const cacheEntry = { data: searchResults, timestamp: Date.now() };
        searchCache.set(keyword, cacheEntry);

        res.json(searchResults);
    } catch (error) {
        console.error("Yahoo Finance search error:", error);
        res.status(500).json({ message: 'Error fetching data from Yahoo Finance' });
    }
});

// Route for getting the latest price (quote)
router.get('/quote/:symbol', async (req, res) => {
    const symbol = req.params.symbol;
    try {
        const quote = await yahooFinance.quote(symbol);
        res.json(quote);
    } catch (error) {
        console.error("Yahoo Finance quote error:", error);
        res.status(500).json({ message: 'Error fetching data from Yahoo Finance' });
    }
});




// Get all predictions for the logged-in user
router.get('/my-predictions', async (req, res) => {
    // Check if a user is logged in via the session
    if (!req.user) {
        return res.status(401).json({ message: 'User not logged in' });
    }
    try {
        // Find all predictions in the database matching the logged-in user's ID
        const predictions = await Prediction.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(predictions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.get('/profile/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-googleId');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // --- START: NEW LOGIC TO FETCH WATCHLIST QUOTES ---
        let watchlistQuotes = [];
        if (user.watchlist && user.watchlist.length > 0) {
            try {
                watchlistQuotes = await yahooFinance.quote(user.watchlist);
            } catch (quoteError) {
                console.error("Failed to fetch some watchlist quotes for profile:", quoteError.message);
                // Continue without crashing, some stocks might be delisted
            }
        }
        // --- END: NEW LOGIC ---

        // Populate both to check for broken links
        await user.populate(['goldenSubscriptions.user', 'goldenSubscribers.user']);

        const predictions = await Prediction.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        const assessedPredictions = predictions.filter(p => p.status === 'Assessed');

        const overallRank = (await User.countDocuments({ score: { $gt: user.score } })) + 1;
        const totalScore = assessedPredictions.reduce((sum, p) => sum + p.score, 0);
        let overallAccuracy = assessedPredictions.length > 0 ? Math.round((totalScore / assessedPredictions.length) * 10) / 10 : 0;

        // --- Helper function to calculate global rank for a specific category ---
        const getGlobalRank = async (field, value, userScore) => {
            const matchStage = { status: 'Assessed' };
            if (field && value) {
                matchStage[field] = value;
            }
            const rankData = await Prediction.aggregate([
                { $match: matchStage },
                { $group: { _id: '$userId', avgScore: { $avg: '$score' } } },
                { $match: { avgScore: { $gt: userScore } } },
                { $count: 'higherRankedUsers' }
            ]);
            return (rankData[0]?.higherRankedUsers || 0) + 1;
        };

        // --- Calculate personal stats ---
        const perfByType = assessedPredictions.reduce((acc, p) => {
            if (!acc[p.predictionType]) acc[p.predictionType] = { total: 0, totalScore: 0 };
            acc[p.predictionType].total++;
            acc[p.predictionType].totalScore += p.score;
            return acc;
        }, {});
        const formattedPerfByType = Object.entries(perfByType).map(([type, data]) => ({
            type,
            accuracy: data.totalScore / data.total,
            count: data.total
        })).sort((a, b) => b.accuracy - a.accuracy);

        const perfByStock = assessedPredictions.reduce((acc, p) => {
            if (!acc[p.stockTicker]) acc[p.stockTicker] = { total: 0, totalScore: 0 };
            acc[p.stockTicker].total++;
            acc[p.stockTicker].totalScore += p.score;
            return acc;
        }, {});
        const formattedPerfByStock = Object.entries(perfByStock).map(([ticker, data]) => ({
            ticker,
            accuracy: data.totalScore / data.total,
            count: data.total
        })).sort((a, b) => b.accuracy - a.accuracy);

        // --- Run all global rank calculations in parallel ---
        const rankPromisesByType = formattedPerfByType.map(p => getGlobalRank('predictionType', p.type, p.accuracy));
        const rankPromisesByStock = formattedPerfByStock.map(s => getGlobalRank('stockTicker', s.ticker, s.accuracy));
        const [resolvedRanksByType, resolvedRanksByStock] = await Promise.all([
            Promise.all(rankPromisesByType),
            Promise.all(rankPromisesByStock)
        ]);

        // --- Combine personal stats with global ranks ---
        const finalPerfByType = formattedPerfByType.map((p, index) => ({
            ...p,
            accuracy: Math.round(p.accuracy * 10) / 10,
            rank: resolvedRanksByType[index]
        }));
        const finalPerfByStock = formattedPerfByStock.map((s, index) => ({
            ...s,
            accuracy: Math.round(s.accuracy * 10) / 10,
            rank: resolvedRanksByStock[index]
        }));

        const performance = {
            overallRank: `#${overallRank}`,
            overallAccuracy,
            byType: finalPerfByType,
            byStock: finalPerfByStock
        };

        const chartData = assessedPredictions.map(p => ({
            id: p._id, score: p.score, createdAt: p.createdAt, predictionType: p.predictionType
        }));

        // FIX: Filter out invalid entries before counting for both lists
        const validSubscriptions = user.goldenSubscriptions.filter(sub => sub.user);
        const validSubscribers = user.goldenSubscribers.filter(sub => sub.user);

        res.json({
            user,
            watchlistQuotes,
            predictions,
            performance,
            chartData,
            followersCount: user.followers.length,
            followingCount: user.following.length,
            goldenSubscribersCount: validSubscribers.length, // Use the filtered count
            goldenSubscriptionsCount: validSubscriptions.length
        });
    } catch (err) {
        console.error("Error fetching profile:", err);
        res.status(500).json({ message: err.message });
    }
});


router.put('/profile/golden-member', async (req, res) => {
    if (!req.user) return res.status(401).send('You must be logged in.');

    try {
        const { isGoldenMember, price, description, acceptingNewSubscribers } = req.body;
        const userToUpdate = await User.findById(req.user._id).populate('goldenSubscribers.user');

        if (!userToUpdate) return res.status(404).json({ message: "User not found." });

        // --- Deactivation Logic ---
        if (userToUpdate.isGoldenMember && isGoldenMember === false) {
            const validSubscribers = userToUpdate.goldenSubscribers.filter(sub => sub.user);
            const subscriberIds = validSubscribers.map(sub => sub.user._id);

            if (subscriberIds.length > 0) {
                const message = `${userToUpdate.username} is no longer a Golden Member. Your subscription has been cancelled.`;
                const notifications = subscriberIds.map(id => ({
                    recipient: id, type: 'GoldenPost', message, link: `/profile/${userToUpdate._id}`
                }));
                await Notification.insertMany(notifications);
                await User.updateMany(
                    { _id: { $in: subscriberIds } },
                    { $pull: { goldenSubscriptions: { user: userToUpdate._id } } }
                );
            }
        }

        // FIX: Use findByIdAndUpdate for a more robust and direct update.
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    isGoldenMember,
                    goldenMemberPrice: price,
                    goldenMemberDescription: description,
                    acceptingNewSubscribers,
                    // Conditionally clear the subscribers list only on deactivation
                    goldenSubscribers: isGoldenMember === false ? [] : userToUpdate.goldenSubscribers
                }
            },
            { new: true, runValidators: true } // runValidators ensures price limits are still checked
        );

        res.json(updatedUser);

    } catch (err) {
        if (err.name === 'ValidationError' && err.errors.goldenMemberPrice) {
            return res.status(400).json({ message: 'Price must be between $1 and $500.' });
        }
        res.status(400).json({ message: 'Failed to update settings.' });
    }
});

router.put('/profile', async (req, res) => {
    if (!req.user) {
        return res.status(401).send('You must be logged in.');
    }
    try {
        // Add 'avatar' to the list of fields to update
        const { username, about, youtubeLink, xLink, avatar } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { username, about, youtubeLink, xLink, avatar }, // Add avatar here
            { new: true, runValidators: true }
        );
        res.json(updatedUser);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

const runAssessmentJob = require('../jobs/assessment-job'); // Make sure this is imported

// Admin route to manually trigger the assessment job
router.post('/admin/evaluate', async (req, res) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).send('Forbidden: Admins only.');
    }
    try {
        console.log('Admin triggered manual evaluation...');
        await runAssessmentJob();
        res.status(200).send('Evaluation job triggered successfully.');
    } catch (error) {
        res.status(500).send('Failed to run evaluation job.');
    }
});


// GET: Historical data for the stock chart
router.get('/stock/:ticker/historical', async (req, res) => {
    const { ticker } = req.params;
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90); // Get data for the last 90 days

        const result = await yahooFinance.historical(ticker, {
            period1: startDate,
        });

        res.json(result);
    } catch (error) {
        console.error(`Yahoo Finance historical error for ${ticker}:`, error.message);
        res.status(500).json({ message: "Error fetching historical data" });
    }
});

// Add this to api.js
// In server/routes/api.js

router.post('/users/:userId/follow', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');

    const followedUserId = req.params.userId;
    const currentUserId = req.user._id;

    // Prevent users from following themselves
    if (followedUserId === currentUserId.toString()) {
        return res.status(400).send("You cannot follow yourself.");
    }

    try {
        // Add user to current user's following list
        await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: followedUserId } });
        // Add current user to the other user's followers list
        await User.findByIdAndUpdate(followedUserId, { $addToSet: { followers: currentUserId } });

        // --- Create a Notification for the user who was followed ---
        await new Notification({
            recipient: followedUserId,
            sender: currentUserId,
            type: 'NewFollower',
            message: `${req.user.username} started following you.`,
            link: `/profile/${currentUserId}`
        }).save();
        // ---------------------------------------------------------

        res.status(200).send('Successfully followed user.');
    } catch (error) {
        res.status(500).json({ message: 'Error following user.' });
    }
});

router.post('/users/:userId/unfollow', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');

    const unfollowedUserId = req.params.userId;
    const currentUserId = req.user._id;

    try {
        // Use $pull to remove an item from an array in MongoDB
        // Remove user from current user's "following" list
        await User.findByIdAndUpdate(currentUserId, { $pull: { following: unfollowedUserId } });
        // Remove current user from the other user's "followers" list
        await User.findByIdAndUpdate(unfollowedUserId, { $pull: { followers: currentUserId } });

        res.status(200).send('Successfully unfollowed user.');
    } catch (error) {
        res.status(500).json({ message: 'Error unfollowing user.' });
    }
});

// Route to fetch notifications
router.get('/notifications', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');
    const notifications = await Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .populate('sender', 'username avatar');
    res.json(notifications);
});


router.get('/widgets/hourly-winners', async (req, res) => {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const winners = await Prediction.find({
            status: 'Assessed',
            updatedAt: { $gte: oneHourAgo }
        })
            .sort({ score: -1 })
            .limit(3)
            // UPDATED: Populate more user fields
            .populate('userId', 'username avatar isGoldenMember');

        const formattedWinners = winners.map(p => ({
            predictionId: p._id,
            userId: p.userId._id,
            username: p.userId.username,
            avatar: p.userId.avatar, // Add avatar
            isGoldenMember: p.userId.isGoldenMember, // Add golden status
            ticker: p.stockTicker,
            score: p.score
        }));

        res.json(formattedWinners);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching hourly winners' });
    }
});

// GET Today's Top Performers - UPDATED
router.get('/widgets/daily-leaders', async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const leaders = await Prediction.aggregate([
            { $match: { createdAt: { $gte: startOfDay }, status: 'Assessed' } },
            { $group: { _id: '$userId', avgScore: { $avg: '$score' } } },
            { $sort: { avgScore: -1 } },
            { $limit: 3 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            {
                $project: {
                    userId: '$_id',
                    username: '$user.username',
                    avgScore: 1,
                    avatar: '$user.avatar',                 // Add avatar
                    isGoldenMember: '$user.isGoldenMember', // Add golden status
                    _id: 0
                }
            }
        ]);
        res.json(leaders);
    } catch (err) { res.status(500).json({ message: 'Error fetching daily leaders' }); }
});

// ++ UPDATED WIDGET: Long-Term Leaders now includes Quarterly predictions ++
router.get('/widgets/long-term-leaders', async (req, res) => {
    try {
        const leaders = await Prediction.aggregate([
            { $match: { predictionType: { $in: ['Yearly', 'Quarterly'] }, status: 'Assessed' } },
            { $group: { _id: '$userId', accuracy: { $avg: '$score' } } },
            { $sort: { accuracy: -1 } },
            { $limit: 3 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            {
                $project: {
                    userId: '$_id',
                    username: '$user.username',
                    accuracy: { $round: ['$accuracy', 0] },
                    avatar: '$user.avatar',
                    isGoldenMember: '$user.isGoldenMember',
                    _id: 0
                }
            }
        ]);
        res.json(leaders);
    } catch (err) { res.status(500).json({ message: 'Error fetching long-term leaders' }); }
});

// GET Famous (Trending) Stocks
router.get('/widgets/famous-stocks', async (req, res) => {
    // This finds which stocks have the most predictions today.
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const stocks = await Prediction.aggregate([
            { $match: { createdAt: { $gte: startOfDay } } },
            { $group: { _id: '$stockTicker', predictions: { $sum: 1 } } },
            { $sort: { predictions: -1 } },
            { $limit: 4 },
            { $project: { ticker: '$_id', predictions: 1, _id: 0 } }
        ]);
        res.json(stocks);
    } catch (err) { res.status(500).json({ message: 'Error fetching famous stocks' }); }
});

// GET Community Feed (most recent predictions) - UPDATED
router.get('/widgets/community-feed', async (req, res) => {
    try {
        const predictions = await Prediction.find({ status: 'Active' })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'username avatar isGoldenMember');

        // Fetch current prices for the tickers in the feed for comparison
        const tickers = [...new Set(predictions.map(p => p.stockTicker))];
        const quotes = await yahooFinance.quote(tickers);
        const priceMap = new Map(quotes.map(q => [q.symbol, q.regularMarketPrice]));

        const feed = predictions.map(p => {
            const currentPrice = priceMap.get(p.stockTicker) || 0;
            const targetPrice = p.targetPrice;

            // --- NEW: Calculate percentage change and determine direction ---
            let percentageChange = 0;
            if (currentPrice > 0) {
                percentageChange = ((targetPrice - currentPrice) / currentPrice) * 100;
            }
            const directionText = targetPrice >= currentPrice ? 'increase to' : 'decrease to';
            const formattedPercentage = `${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%`;

            return {
                id: p._id,
                // UPDATED: New, richer text format for the community feed
                text: `${p.userId.username} predicted ${p.stockTicker} will ${directionText} $${targetPrice.toFixed(2)}`,
                percentage: formattedPercentage, // Send percentage separately for frontend coloring
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


// NEW Extended Follow/Subscription Data Endpoint
router.get('/users/:userId/follow-data-extended', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .populate('followers', 'username avatar isGoldenMember')
            .populate('following', 'username avatar isGoldenMember')
            .populate('goldenSubscribers.user', 'username avatar isGoldenMember')
            .populate('goldenSubscriptions.user', 'username avatar isGoldenMember');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const getScoresForUserIds = async (userIds) => {
            if (userIds.length === 0) return new Map();
            const results = await Prediction.aggregate([
                { $match: { userId: { $in: userIds }, status: 'Assessed' } },
                { $group: { _id: '$userId', avgScore: { $avg: '$score' } } }
            ]);
            return new Map(results.map(r => [r._id.toString(), Math.round(r.avgScore)]));
        };

        const allUserIds = [
            ...user.followers.map(u => u._id),
            ...user.following.map(u => u._id),
            // FIX: Add a .filter(sub => sub.user) to safely ignore deleted or invalid user references
            ...user.goldenSubscribers.filter(sub => sub.user).map(sub => sub.user._id),
            ...user.goldenSubscriptions.filter(sub => sub.user).map(sub => sub.user._id)
        ];
        const uniqueUserIds = [...new Set(allUserIds)];
        const scoresMap = await getScoresForUserIds(uniqueUserIds);

        const combineUserDataWithScore = (userData) => ({
            ...userData.toObject(),
            avgScore: scoresMap.get(userData._id.toString()) || 0
        });

        res.json({
            profileUser: { username: user.username, isGoldenMember: user.isGoldenMember },
            followers: user.followers.map(combineUserDataWithScore),
            following: user.following.map(combineUserDataWithScore),
            // FIX: Add a .filter() here as well to ensure the final list is clean
            goldenSubscribers: user.goldenSubscribers
                .filter(sub => sub.user)
                .map(sub => ({
                    ...combineUserDataWithScore(sub.user),
                    subscribedAt: sub.subscribedAt
                })),
            goldenSubscriptions: user.goldenSubscriptions
                .filter(sub => sub.user)
                .map(sub => ({
                    ...combineUserDataWithScore(sub.user),
                    subscribedAt: sub.subscribedAt
                }))
        });
    } catch (err) {
        console.error("Error fetching extended follow data:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET: Data for a specific stock page - FULLY OVERHAULED
router.get('/stock/:ticker', async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    const { type: predictionTypeFilter = 'Overall' } = req.query;

    try {
        // Fetch quote data and active predictions in parallel
        const [quote, activePredictions] = await Promise.all([
            yahooFinance.quote(ticker),
            Prediction.find({ stockTicker: ticker, status: 'Active' })
                .populate('userId', 'username avatar isGoldenMember')
                .sort({ createdAt: -1 })
        ]);

        // Build the match criteria for the aggregation
        const predictionMatch = { status: 'Assessed', stockTicker: ticker };
        if (predictionTypeFilter !== 'Overall') {
            predictionMatch.predictionType = predictionTypeFilter;
        }

        // Use aggregation to find the top predictors for this specific stock
        const topPredictors = await Prediction.aggregate([
            { $match: predictionMatch },
            { $group: { _id: '$userId', avgScore: { $avg: '$score' } } },
            { $sort: { avgScore: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userDetails' } },
            { $unwind: '$userDetails' },
            {
                $project: {
                    _id: '$userDetails._id',
                    username: '$userDetails.username',
                    avatar: '$userDetails.avatar',
                    isGoldenMember: '$userDetails.isGoldenMember',
                    avgScore: { $round: ['$avgScore', 1] }
                }
            }
        ]);

        res.json({ quote, topPredictors, activePredictions });

    } catch (err) {
        console.error(`Error fetching data for stock ${ticker}:`, err);
        res.status(500).json({ message: "Failed to fetch stock data" });
    }
});

// In server/routes/api.js

// GET: The details for a single prediction
router.get('/prediction/:id', async (req, res) => {
    try {
        const prediction = await Prediction.findById(req.params.id)
            // FIX: Add 'isGoldenMember' to the fields being populated
            .populate('userId', 'username avatar isGoldenMember');

        if (!prediction) {
            return res.status(404).json({ message: "Prediction not found" });
        }
        res.json(prediction);
    } catch (err) {
        console.error("Error fetching prediction:", err);
        res.status(500).json({ message: "Error fetching prediction details" });
    }
});

router.post('/notifications/mark-read', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');
    try {
        await Notification.updateMany(
            { recipient: req.user._id, read: false },
            { $set: { read: true } }
        );
        res.status(200).send('Notifications marked as read.');
    } catch (err) {
        res.status(500).json({ message: 'Error updating notifications' });
    }
});

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

// Replace 'POST /users/:userId/cancel-golden'
router.post('/users/:userId/cancel-golden', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');
    const goldenMemberId = req.params.userId;
    const currentUserId = req.user._id;

    try {
        await User.findByIdAndUpdate(goldenMemberId, { $pull: { goldenSubscribers: { user: currentUserId } } });
        await User.findByIdAndUpdate(currentUserId, { $pull: { goldenSubscriptions: { user: goldenMemberId } } });
        res.status(200).send('Successfully canceled subscription.');
    } catch (error) {
        res.status(500).json({ message: 'Error canceling subscription.' });
    }
});

// POST: Cancel a golden member's subscription
router.post('/users/:userId/cancel-golden', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');

    const goldenMemberId = req.params.userId;
    const currentUserId = req.user._id;

    try {
        // Remove current user from the golden member's subscriber list
        await User.findByIdAndUpdate(goldenMemberId, { $pull: { goldenSubscribers: currentUserId } });
        // Remove golden member from the current user's subscription list
        await User.findByIdAndUpdate(currentUserId, { $pull: { goldenSubscriptions: goldenMemberId } });

        res.status(200).send('Successfully canceled subscription.');
    } catch (error) {
        res.status(500).json({ message: 'Error canceling subscription.' });
    }
});

// Find and update your /api/explore/feed route
router.get('/explore/feed', async (req, res) => {
    const { status = 'Active', stock, predictionType, sortBy = 'date' } = req.query;

    if (!['Active', 'Assessed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status filter' });
    }

    try {
        const matchQuery = { status };
        if (stock) matchQuery.stockTicker = stock.toUpperCase();
        if (predictionType && predictionType !== 'All') matchQuery.predictionType = predictionType;

        let predictions;
        const limit = 50;

        // The aggregation pipeline is now used for both 'performance' and 'votes'
        if (sortBy === 'performance' || sortBy === 'votes') {
            let sortStage = {};

            if (sortBy === 'performance') {
                sortStage = { 'userDetails.score': -1, createdAt: -1 };
            } else { // sortBy === 'votes'
                sortStage = { voteScore: -1, createdAt: -1 };
            }

            predictions = await Prediction.aggregate([
                { $match: matchQuery },
                {
                    $addFields: {
                        voteScore: { $subtract: [{ $size: { $ifNull: ["$likes", []] } }, { $size: { $ifNull: ["$dislikes", []] } }] }
                    }
                },
                { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userDetails' } },
                { $unwind: '$userDetails' },
                { $sort: sortStage },
                { $limit: limit },
                // FIX: This project stage is now complete and ensures all data is returned
                {
                    $project: {
                        _id: 1, stockTicker: 1, targetPrice: 1, predictionType: 1, deadline: 1,
                        status: 1, score: 1, actualPrice: 1, createdAt: 1, description: 1,
                        priceAtCreation: 1, likes: 1, dislikes: 1,
                        userId: { // Manually reshape the userDetails to match the populate() structure
                            _id: '$userDetails._id',
                            username: '$userDetails.username',
                            avatar: '$userDetails.avatar',
                            isGoldenMember: '$userDetails.isGoldenMember',
                            score: '$userDetails.score'
                        }
                    }
                }
            ]);

        } else {
            // Standard find for date-based sorting
            predictions = await Prediction.find(matchQuery)
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('userId', 'username avatar isGoldenMember score')
                .lean();
        }

        // Add current price to active predictions
        if (status === 'Active' && predictions.length > 0) {
            const tickers = [...new Set(predictions.map(p => p.stockTicker))];
            if (tickers.length > 0) {
                const quotes = await yahooFinance.quote(tickers);
                const priceMap = new Map(quotes.map(q => [q.symbol, q.regularMarketPrice]));
                predictions.forEach(p => {
                    p.currentPrice = priceMap.get(p.stockTicker) || 0;
                });
            }
        }

        res.json(predictions);
    } catch (err) {
        console.error(`Error fetching explore feed:`, err);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- ADD THIS NEW ADMIN ROUTE ---
router.post('/admin/recalculate-badges', async (req, res) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).send('Forbidden: Admins only.');
    }

    try {
        console.log('--- Admin triggered badge recalculation for all users ---');

        const allUsers = await User.find({}).populate('followers');

        for (const user of allUsers) {
            // FIX: Add a check to skip users that are missing an email.
            if (!user.email) {
                console.warn(`Skipping user with ID ${user._id} because they are missing an email.`);
                continue; // This jumps to the next user in the loop.
            }

            user.badges = []; // Clear existing badges for a fresh calculation

            const userPredictions = await Prediction.find({ userId: user._id, status: 'Assessed' });

            if (userPredictions.length > 0) {
                const totalScore = userPredictions.reduce((sum, p) => sum + p.score, 0);
                const overallAccuracy = totalScore / userPredictions.length;

                await awardBadges(user, { overallAccuracy });
            }
        }

        console.log(`--- Badge recalculation completed for ${allUsers.length} users. ---`);
        res.status(200).send('Successfully recalculated badges for all users.');

    } catch (error) {
        console.error("Error during badge recalculation:", error);
        res.status(500).send('An error occurred during recalculation.');
    }
});

module.exports = router;