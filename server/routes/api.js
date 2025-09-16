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

// Get Scoreboard Data (Top Users)
router.get('/scoreboard', async (req, res) => {
    try {
        const topUsers = await User.find().sort({ score: -1 }).limit(20);
        res.json(topUsers);
    } catch (err) {
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


// In server/routes/api.js

// In server/routes/api.js

router.post('/predict', async (req, res) => {
    // Check if a user is logged in from the session created by Passport.js
    if (!req.user) {
        return res.status(401).send('You must be logged in to make a prediction.');
    }

    const { stockTicker, targetPrice, deadline, predictionType, rationale, confidence } = req.body;

    // Create the new prediction using the logged-in user's ID
    const prediction = new Prediction({
        userId: req.user._id,
        stockTicker,
        targetPrice,
        deadline,
        predictionType,
        rationale,
        confidence
    });
    try {
        await prediction.save();
        res.status(201).json(prediction);
    } catch (err) {
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


// Get a user's public profile data

router.get('/profile/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-googleId');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const predictions = await Prediction.find({ userId: req.params.userId });
        const assessedPredictions = predictions.filter(p => p.status === 'Assessed');

        // --- Start Calculating Performance Stats ---

        // Overall Stats
        const successfulPredictions = assessedPredictions.filter(p => p.score > 60).length;
        const overallAccuracy = assessedPredictions.length > 0 ? (successfulPredictions / assessedPredictions.length) * 100 : 0;

        // Performance by Type
        const performanceByType = assessedPredictions.reduce((acc, p) => {
            if (!acc[p.predictionType]) {
                acc[p.predictionType] = { total: 0, successful: 0 };
            }
            acc[p.predictionType].total++;
            if (p.score > 60) acc[p.predictionType].successful++;
            return acc;
        }, {});

        // Performance by Stock
        const performanceByStock = assessedPredictions.reduce((acc, p) => {
            if (!acc[p.stockTicker]) {
                acc[p.stockTicker] = { total: 0, successful: 0, totalPoints: 0 };
            }
            acc[p.stockTicker].total++;
            acc[p.stockTicker].totalPoints += p.score;
            if (p.score > 60) acc[p.stockTicker].successful++;
            return acc;
        }, {});

        // --- Format Data for Frontend ---
        const formattedPerfByType = Object.entries(performanceByType).map(([type, data]) => ({
            type,
            accuracy: `${Math.round((data.successful / data.total) * 100)}%`,
            rank: `#${Math.floor(Math.random() * 20) + 1}` // Placeholder for rank
        }));

        const formattedPerfByStock = Object.entries(performanceByStock).map(([ticker, data]) => ({
            ticker,
            accuracy: `${Math.round((data.successful / data.total) * 100)}%`,
            rank: `#${Math.floor(Math.random() * 10) + 1}`, // Placeholder for rank
            totalPoints: data.totalPoints
        }));

        const performance = {
            overallRank: `#${Math.floor(Math.random() * 50) + 1}`, // Placeholder for rank
            overallAccuracy: Math.round(overallAccuracy),
            byType: formattedPerfByType,
            byStock: formattedPerfByStock
        };

        res.json({
            user,
            predictions,
            performance,
            followersCount: user.followers.length,
            followingCount: user.following.length
        });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// In server/routes/api.js

router.put('/profile', async (req, res) => {
    if (!req.user) {
        return res.status(401).send('You must be logged in.');
    }
    try {
        const { username, about, youtubeLink, xLink } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { username, about, youtubeLink, xLink },
            { new: true, runValidators: true } // Return the updated document
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
router.post('/users/:userId/follow', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');
    // Add user to current user's following list
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: req.params.userId } });
    // Add current user to the other user's followers list
    await User.findByIdAndUpdate(req.params.userId, { $addToSet: { followers: req.user._id } });
    res.status(200).send('Successfully followed user.');
});

// Route to fetch notifications
router.get('/notifications', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');
    const notifications = await Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .populate('sender', 'username avatar');
    res.json(notifications);
});

// In server/routes/api.js

router.get('/widgets/hourly-winners', async (req, res) => {
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // Find predictions assessed in the last hour, sort by score, take top 3
        const winners = await Prediction.find({
            status: 'Assessed',
            updatedAt: { $gte: oneHourAgo } // Check when it was assessed
        })
            .sort({ score: -1 })
            .limit(3)
            .populate('userId', 'username'); // Get user info

        // Format the data for the frontend
        const formattedWinners = winners.map(p => ({
            userId: p.userId._id,
            username: p.userId.username,
            ticker: p.stockTicker,
            score: p.score
        }));

        res.json(formattedWinners);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching hourly winners' });
    }
});

// GET Today's Top Performers
router.get('/widgets/daily-leaders', async (req, res) => {
    // This is complex logic: it finds today's predictions, groups them by user,
    // calculates the average score for each user, and returns the top 3.
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
            { $project: { userId: '$_id', username: '$user.username', avgScore: 1, _id: 0 } }
        ]);
        res.json(leaders);
    } catch (err) { res.status(500).json({ message: 'Error fetching daily leaders' }); }
});

// GET Long-Term Leaders
router.get('/widgets/long-term-leaders', async (req, res) => {
    // This logic finds the top 3 users with the highest average score on 'Yearly' predictions.
    try {
        const leaders = await Prediction.aggregate([
            { $match: { predictionType: 'Yearly', status: 'Assessed' } },
            { $group: { _id: '$userId', accuracy: { $avg: '$score' } } },
            { $sort: { accuracy: -1 } },
            { $limit: 3 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { userId: '$_id', username: '$user.username', accuracy: { $round: ['$accuracy', 0] }, _id: 0 } }
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

// GET Community Feed (most recent predictions)
router.get('/widgets/community-feed', async (req, res) => {
    try {
        const predictions = await Prediction.find({ status: 'Active' })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'username');

        const feed = predictions.map(p => ({
            id: p._id,
            text: `${p.userId.username} made a new ${p.predictionType} prediction on ${p.stockTicker}`
        }));
        res.json(feed);
    } catch (err) { res.status(500).json({ message: 'Error fetching community feed' }); }
});

module.exports = router;