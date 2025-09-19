const express = require('express');
const router = express.Router();
const yahooFinance = require('yahoo-finance2').default;
const axios = require('axios'); // <-- Added for making API calls
const User = require('../models/User');
const Prediction = require('../models/Prediction');
const Notification = require('../models/Notification');
const Setting = require('../models/Setting'); // Import the new model

const searchCache = new Map();

// --- SETTINGS ROUTES ---

// GET: A public route to fetch current settings
router.get('/settings', async (req, res) => {
    try {
        const settings = await Setting.findOne(); // Get the single settings document
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching settings' });
    }
});

// PUT: An admin-only route to update settings
router.put('/settings/admin', async (req, res) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).send('Forbidden: Admins only.');
    }
    try {
        const { isPromoBannerActive } = req.body;
        const updatedSettings = await Setting.findOneAndUpdate({},
            { isPromoBannerActive },
            { new: true, upsert: true } // upsert: true creates the document if it doesn't exist
        );
        res.json(updatedSettings);
    } catch (err) {
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
router.post('/predict', async (req, res) => {
    if (!req.user) return res.status(401).send('You must be logged in.');

    const { stockTicker, targetPrice, deadline, predictionType } = req.body;
    try {
        const quote = await yahooFinance.quote(stockTicker);
        const currentPrice = quote.regularMarketPrice;

        const percentageChange = ((targetPrice - currentPrice) / currentPrice) * 100;
        const directionText = targetPrice >= currentPrice ? 'increase to' : 'decrease to';
        const formattedPercentage = `${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%`;

        const prediction = new Prediction({
            userId: req.user._id,
            stockTicker,
            targetPrice,
            deadline,
            predictionType,
            status: 'Active'
        });
        await prediction.save();

        const user = await User.findById(req.user._id);

        // UPDATED: The message is now split into two parts for styling
        const mainMessage = `${user.username} predicted ${stockTicker} will ${directionText} $${targetPrice.toFixed(2)}`;

        const notifications = user.followers.map(followerId => ({
            recipient: followerId,
            sender: user._id,
            type: 'NewPrediction',
            message: mainMessage, // The main text
            metadata: { percentage: formattedPercentage }, // The part to be colored
            link: `/prediction/${prediction._id}`
        }));

        if (notifications.length > 0) await Notification.insertMany(notifications);

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

// GET a user's public profile data (UPDATED WITH NEW ACCURACY LOGIC)
// GET a user's public profile data (UPDATED WITH 1-DIGIT FLOAT)
router.get('/profile/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-googleId');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const predictions = await Prediction.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        const assessedPredictions = predictions.filter(p => p.status === 'Assessed');

        // --- Start Calculating REAL Performance Stats ---

        // 1. Real Overall Rank
        const overallRank = (await User.countDocuments({ score: { $gt: user.score } })) + 1;

        // 2. NEW: Overall Accuracy is now Average Score with one decimal
        const totalScore = assessedPredictions.reduce((sum, p) => sum + p.score, 0);
        let overallAccuracy = 0;
        if (assessedPredictions.length > 0) {
            // Multiply by 10, round, then divide by 10 to keep one decimal place
            overallAccuracy = Math.round((totalScore / assessedPredictions.length) * 10) / 10;
        }

        // 3. Performance by Type (with personal ranking and avg score)
        const performanceByType = assessedPredictions.reduce((acc, p) => {
            if (!acc[p.predictionType]) {
                acc[p.predictionType] = { total: 0, totalScore: 0 };
            }
            acc[p.predictionType].total++;
            acc[p.predictionType].totalScore += p.score;
            return acc;
        }, {});

        const formattedPerfByType = Object.entries(performanceByType).map(([type, data]) => ({
            type,
            accuracy: Math.round(data.totalScore / data.total), // This is now average score
        })).sort((a, b) => b.accuracy - a.accuracy) // Sort by best average score
            .map((item, index) => ({ ...item, rank: index + 1 })); // Assign rank

        // 4. Performance by Stock (with personal ranking and avg score)
        const performanceByStock = assessedPredictions.reduce((acc, p) => {
            if (!acc[p.stockTicker]) {
                acc[p.stockTicker] = { total: 0, totalScore: 0 };
            }
            acc[p.stockTicker].total++;
            acc[p.stockTicker].totalScore += p.score;
            return acc;
        }, {});

        const formattedPerfByStock = Object.entries(performanceByStock).map(([ticker, data]) => ({
            ticker,
            accuracy: Math.round(data.totalScore / data.total), // This is now average score
        })).sort((a, b) => b.accuracy - a.accuracy) // Sort by best average score
            .map((item, index) => ({ ...item, rank: index + 1 })); // Assign rank

        // 5. Final Performance Object
        const performance = {
            overallRank: `#${overallRank}`,
            overallAccuracy: overallAccuracy, // This will now be a float like 78.5
            byType: formattedPerfByType,
            byStock: formattedPerfByStock
        };

        const chartData = assessedPredictions.map(p => ({
            id: p._id, score: p.score, createdAt: p.createdAt, predictionType: p.predictionType
        }));

        // NEW: Add golden member counts to the main payload
        res.json({
            user,
            predictions,
            performance,
            chartData,
            followersCount: user.followers.length,
            followingCount: user.following.length,
            goldenSubscribersCount: user.goldenSubscribers?.length || 0,
            goldenSubscriptionsCount: user.goldenSubscriptions?.length || 0,
        });

    } catch (err) {
        console.error("Error fetching profile:", err);
        res.status(500).json({ message: err.message });
    }
});


// --- NEW ROUTE for Golden Member Settings ---
router.put('/profile/golden-member', async (req, res) => {
    if (!req.user) {
        return res.status(401).send('You must be logged in.');
    }

    try {
        const { isGoldenMember, price, description } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            {
                isGoldenMember,
                goldenMemberPrice: price,
                goldenMemberDescription: description
            },
            { new: true, runValidators: true }
        );
        res.json(updatedUser);
    } catch (err) {
        res.status(400).json({ message: err.message });
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

// In server/routes/api.js
router.get('/stock/:ticker', async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    try {
        // Fetch quote data, predictions for this stock, top predictors, etc.
        const quote = await yahooFinance.quote(ticker);
        const predictions = await Prediction.find({ stockTicker: ticker }).populate('userId', 'username score avatar');

        // Logic to find top predictors for this stock would go here

        res.json({ quote, predictions });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch stock data" });
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

// GET Long-Term Leaders - UPDATED
router.get('/widgets/long-term-leaders', async (req, res) => {
    try {
        const leaders = await Prediction.aggregate([
            { $match: { predictionType: 'Yearly', status: 'Assessed' } },
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
                    avatar: '$user.avatar',                 // Add avatar
                    isGoldenMember: '$user.isGoldenMember', // Add golden status
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
            .populate('followers', 'username avatar about isGoldenMember')
            .populate('following', 'username avatar about isGoldenMember')
            .populate('goldenSubscribers', 'username avatar about isGoldenMember')
            .populate('goldenSubscriptions', 'username avatar about isGoldenMember');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Helper to get average scores for a list of users
        const getScoresForUsers = async (userList) => {
            const userIds = userList.map(u => u._id);
            const results = await Prediction.aggregate([
                { $match: { userId: { $in: userIds }, status: 'Assessed' } },
                { $group: { _id: '$userId', avgScore: { $avg: '$score' } } }
            ]);

            const scoresMap = new Map(results.map(r => [r._id.toString(), Math.round(r.avgScore)]));

            return userList.map(u => ({
                ...u.toObject(),
                avgScore: scoresMap.get(u._id.toString()) || 0
            }));
        };

        res.json({
            profileUser: { username: user.username, isGoldenMember: user.isGoldenMember },
            followers: await getScoresForUsers(user.followers),
            following: await getScoresForUsers(user.following),
            goldenSubscribers: await getScoresForUsers(user.goldenSubscribers),
            goldenSubscriptions: await getScoresForUsers(user.goldenSubscriptions)
        });
    } catch (err) {
        console.error("Error fetching extended follow data:", err);
        res.status(500).json({ message: "Server error" });
    }
});



router.get('/stock/:ticker/historical', async (req, res) => {
    const { ticker } = req.params;

    try {
        // Get the date from 90 days ago
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);

        // Fetch historical data using the yahoo-finance2 library
        const result = await yahooFinance.historical(ticker, {
            period1: startDate,
        });

        res.json(result);
    } catch (error) {
        console.error(`Yahoo Finance historical error for ${ticker}:`, error.message);
        res.status(500).json({ message: "Error fetching historical data" });
    }
});

// In server/routes/api.js

// GET: The details for a single prediction
router.get('/prediction/:id', async (req, res) => {
    try {
        const prediction = await Prediction.findById(req.params.id)
            .populate('userId', 'username avatar'); // Get the predictor's info

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

// POST: Join a golden member's subscription
router.post('/users/:userId/join-golden', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');

    const goldenMemberId = req.params.userId;
    const currentUserId = req.user._id;

    if (goldenMemberId === currentUserId.toString()) {
        return res.status(400).send("You cannot subscribe to yourself.");
    }

    try {
        // Add current user to the golden member's subscriber list
        await User.findByIdAndUpdate(goldenMemberId, { $addToSet: { goldenSubscribers: currentUserId } });
        // Add golden member to the current user's subscription list
        await User.findByIdAndUpdate(currentUserId, { $addToSet: { goldenSubscriptions: goldenMemberId } });

        res.status(200).send('Successfully joined golden member subscription.');
    } catch (error) {
        res.status(500).json({ message: 'Error joining subscription.' });
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



module.exports = router;