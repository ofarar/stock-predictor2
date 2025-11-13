const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const financeAPI = require('../services/financeAPI'); // Import the adapter
const axios = require('axios'); // <-- Added for making API calls
const User = require('../models/User');
const Prediction = require('../models/Prediction');
const Notification = require('../models/Notification');
const Setting = require('../models/Setting'); // Import the new model
const { awardBadges } = require('../services/badgeService');
const Post = require('../models/Post');
const { sendContactFormEmail, sendWaitlistConfirmationEmail, sendWelcomeEmail, transporter, sendGoldenActivationEmail, sendGoldenDeactivationEmail, sendPriceChangeEmail } = require('../services/email');
const AIWizardWaitlist = require('../models/AIWizardWaitlist');
const xss = require('xss');
const rateLimit = require('express-rate-limit');
const PredictionLog = require('../models/PredictionLog');
const JobLog = require('../models/JobLog');
const { createOrUpdateStripePriceForUser } = require('./stripe');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getCommunitySentiment } = require('../utils/sentimentHelper');

// Rate limiter for the contact form
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many contact form submissions from this IP, please try again after an hour',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// --- ADD THESE NEW LIMITERS ---
const predictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // Max 100 predictions per hour per IP (adjust as needed)
    message: 'You have made too many predictions, please try again after an hour',
});

const actionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Max 200 "actions" (like/follow) per 15 min per IP
    message: 'Too many actions, please try again later.',
});

const viewLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // Limit each IP to 100 view requests per hour
    message: 'Too many requests.',
});
// --- END ADDITION ---

// --- NEW ROUTE FOR SHARING POINTS ---
router.post('/activity/share', actionLimiter, async (req, res) => {
    if (!req.user) return res.status(401).send('Not authenticated');

    // Award a small, fixed amount of points for any share action.
    // The 'actionLimiter' we already have prevents a user from spamming this.
    try {
        // --- FIX: Use Read-Modify-Save to prevent crash on undefined object ---
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        // --- FIX: On-the-fly migration from Number to Object ---
        let currentRating = user.analystRating;
        console.error("Error in /api/activity/share:", currentRating); // Add logging
        if (typeof currentRating !== 'object' || currentRating === null) {
            // 'currentRating' is a number (like 35) or undefined/null.
            // We will assume all old points were from 'fromShares' as it's the only one that could have run.
            const oldPoints = typeof currentRating === 'number' ? currentRating : 0;

            user.analystRating = {
                total: oldPoints,
                fromPredictions: 0,
                fromBadges: 0,
                fromShares: oldPoints, // Assume old points were from shares
                fromReferrals: 0,
                fromRanks: 0
            };
        }
        // --- END FIX ---
        console.error("Error in /api/activity/share:", user.analystRating.total); // Add logging
        user.analystRating.total = (user.analystRating.total || 0) + 5;
        user.analystRating.fromShares = (user.analystRating.fromShares || 0) + 5;

        await user.save();
        // --- END FIX ---
        res.status(200).json({ message: 'Rating applied.' });
    } catch (err) {
        console.error("Error in /api/activity/share:", err); // Add logging
    }
});
// --- END NEW ROUTE ---

// NEW: Community Sentiment Endpoint
router.get('/community-sentiment/:ticker', async (req, res) => {
    const { ticker } = req.params;

    try {
        // Use the reusable function
        const sentiment = await getCommunitySentiment(ticker);
        // It's better to return an empty array than a 404
        // The frontend can then display a "no data" message.
        res.json(sentiment);

    } catch (err) {
        // This outer catch is for network/request-level errors
        console.error(`Community sentiment fetch error for ${ticker}:`, err.message);
        res.status(500).json({ message: "Failed to fetch community sentiment" });
    }
});

// NEW: Paginated endpoint for Top Predictors on a Stock Page
router.get('/stock/:ticker/top-predictors', async (req, res) => {
    const { ticker } = req.params;
    const { predictionType = 'Overall', page = 1, limit = 5 } = req.query; // Smaller limit for this view

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
            { $group: { _id: '$userId', avgRating: { $avg: { $ifNull: ["$rating", "$score"] } } } }, // <-- MIGRATE
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
                    avgRating: { $round: ['$avgRating', 1] } // <-- Renamed
                }
            }
        ]);

        res.json({ items: predictors, totalPages, currentPage: pageNum });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch top predictors" });
    }
});

// NEW: Paginated endpoint for Active Predictions on a Stock Page
router.get('/stock/:ticker/active-predictions', async (req, res) => {
    const { ticker } = req.params;
    const { page = 1, limit = 5 } = req.query; // Smaller limit

    try {
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const query = { stockTicker: ticker.toUpperCase(), status: 'Active' };

        const totalItems = await Prediction.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limitNum);

        const predictions = await Prediction.find(query)
            .sort({ createdAt: -1 })
            .populate('userId', 'username avatar isGoldenMember isVerified')
            .skip(skip)
            .limit(limitNum);

        res.json({ items: predictions, totalPages, currentPage: pageNum });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch active predictions" });
    }
});

router.post('/admin/health-check/:service', async (req, res) => {
    // 1. Security check remains the same.
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }

    const { service } = req.params;

    const checkService = async (promiseFn, successDetails) => {
        const startTime = Date.now();
        try {
            // 1. Capture the resolved value from the promise (e.g., "Quotes: 5...")
            const resolvedDetails = await promiseFn();
            const latency = Date.now() - startTime;

            // 2. Prioritize the resolved value. Fallback to successDetails, then 'OK'.
            const details = resolvedDetails || successDetails || 'OK';

            return res.json({ service, status: 'success', latency: `${latency}ms`, details: details });
        } catch (error) {
            const latency = Date.now() - startTime;
            console.error(`Health Check Error [${service}]:`, error);
            return res.json({ service, status: 'failed', latency: `${latency}ms`, details: error.message }); // <-- FIX
        }
    };

    // 2. Use a switch statement to run only the requested check.
    switch (service) {
        case 'mongodb':
            return checkService(() => new Promise((resolve, reject) => {
                const state = mongoose.connection.readyState;
                if (state === 1) resolve();
                else reject(new Error(`DB state is not connected (state: ${state})`));
            }));
        // --- ADD THIS NEW CASE ---
        case 'api-calls':
            return checkService(() => new Promise((resolve, reject) => {
                const stats = financeAPI.getApiCallStats();
                // Format the stats into a string for the 'details' field
                const details = `Quotes: ${stats.getQuote}, History: ${stats.getHistorical}, Search: ${stats.search}`;
                resolve(details);
            }), 'OK'); // The 'OK' here is just a fallback
        // --- END NEW CASE ---
        case 'finance-current':
            return checkService(() => financeAPI.getQuote('AAPL'));
        case 'finance-historical':
            return checkService(() => financeAPI.getHistorical('AAPL', { period1: '2024-01-01' }));
        case 'avatar':
            return checkService(async () => {
                await axios.get('https://api.dicebear.com/8.x/lorelei/svg?seed=test');
                return 'OK (DiceBear API is responsive)'; // <-- FIX
            });
        case 'email':
            return checkService(() => transporter.verify());
        case 'cron':
            return checkService(async () => {
                const jobLog = await JobLog.findOne({ jobId: 'assessment-job' });
                if (!jobLog) throw new Error('Scheduler has likely never run.');
                if (Date.now() - new Date(jobLog.lastAttemptedRun).getTime() > 10 * 60 * 1000) {
                    throw new Error('Scheduler is down. Last heartbeat was over 10 minutes ago.');
                }
                const lastSuccessLog = await PredictionLog.findOne().sort({ assessedAt: -1 });
                if (!lastSuccessLog) return 'OK (Scheduler running, no work yet)';
                const hoursSinceSuccess = ((Date.now() - new Date(lastSuccessLog.assessedAt).getTime()) / 3600000).toFixed(1);
                return `OK (Last scored item ${hoursSinceSuccess} hours ago)`;
            });
        case 'db-integrity':
            return checkService(async () => {
                const allUserIds = await User.find().select('_id');
                const orphanedPredictions = await Prediction.countDocuments({ userId: { $nin: allUserIds } });
                if (orphanedPredictions > 0) {
                    throw new Error(`${orphanedPredictions} orphaned prediction(s) found. Data needs cleanup.`);
                }
                return 'OK (No orphaned data found)';
            });

        case 'badge-json':
            return checkService(async () => {
                const settings = await Setting.findOne();
                if (!settings || !settings.badgeSettings) {
                    throw new Error('Badge settings object not found in the database.');
                }
                if (typeof settings.badgeSettings !== 'object' || Array.isArray(settings.badgeSettings)) {
                    throw new Error('Badge settings are not a valid JSON object.');
                }
                return 'OK (Badge rules are a valid object)';
            });

        case 'api-performance':
            return checkService(async () => {
                const anyUser = await User.findOne().select('_id');
                if (!anyUser) {
                    return 'OK (Skipped: No users in DB to test)';
                }
                const port = process.env.PORT || 5001;
                // This makes an internal HTTP request to test the full stack for the profile endpoint
                await axios.get(`http://localhost:${port}/api/profile/${anyUser._id}`);
                return 'OK'; // We only care if it resolves without error
            });

        case 'config-env':
            return checkService(() => new Promise((resolve, reject) => {
                const requiredVars = ['MONGO_URI', 'COOKIE_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GMAIL_USER', 'GMAIL_PASS'];
                const missingVars = requiredVars.filter(v => !process.env[v]);
                if (missingVars.length > 0) {
                    reject(new Error(`Missing required environment variables: ${missingVars.join(', ')}`));
                } else {
                    resolve('OK (All required variables are present)');
                }
            }));

        default:
            return res.status(404).json({ message: 'Unknown service check.' });
    }
});

// NEW: Recommendation Wizard Endpoint
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

        // If no real recommendations could be generated (because no one has an assessed score),
        // send dummy data so the frontend UI can be tested.
        // if (recommended.length === 0) { // MODIFIED: Simplified the condition
        //     console.log('No real recommendations found, sending dummy data for UI testing.');
        //     return res.json([
        //         { _id: 'dummy1', username: 'StockSavvy', avatar: 'https://i.pravatar.cc/150?u=dummy1', isVerified: true, score: 85, matchPercentage: 95 },
        //         { _id: 'dummy2', username: 'MarketMaestro', avatar: 'https://i.pravatar.cc/150?u=dummy2', isVerified: false, score: 72, matchPercentage: 88 },
        //         { _id: 'dummy3', username: 'ProfitProphet', avatar: 'https://i.pravatar.cc/150?u=dummy3', isVerified: true, score: 91, matchPercentage: 82 },
        //     ]);
        // }

        res.json(recommended);

    } catch (error) {
        console.error('Recommendation error:', error);
        // Replace the dummy data with a proper server error response.
        res.status(500).json({ message: "find_member_wizard.error_recommendations_generic" });
        // On any crash, also send dummy data so the frontend doesn't break.
        // res.json([
        //     { _id: 'dummy1', username: 'StockSavvy', avatar: 'https://i.pravatar.cc/150?u=dummy1', isVerified: true, score: 85, matchPercentage: 95 },
        //     { _id: 'dummy2', username: 'MarketMaestro', avatar: 'https://i.pravatar.cc/150?u=dummy2', isVerified: false, score: 72, matchPercentage: 88 },
        //     { _id: 'dummy3', username: 'ProfitProphet', avatar: 'https://i.pravatar.cc/150?u=dummy3', isVerified: true, score: 91, matchPercentage: 82 },
        // ]);
    }
});


// Route to get pending profile data
router.get('/pending-profile', (req, res) => {
    console.log('GET /api/pending-profile hit. Session:', req.session); // <-- ADDED LOG
    if (req.session.pendingProfile) {
        console.log('Pending profile found:', req.session.pendingProfile); // <-- ADDED LOG
        res.json(req.session.pendingProfile);
    } else {
        console.log('No pending profile found in session.'); // <-- ADDED LOG
        res.status(404).json({ message: 'No pending profile found.' });
    }
});

// Route to complete registration
router.post('/complete-registration', async (req, res) => {
    if (!req.session.pendingProfile) {
        return res.status(400).json({ success: false, message: 'No pending registration found.' });
    }

    const { username } = req.body;
    const { googleId, email, avatar } = req.session.pendingProfile;

    try {
        // Check if the chosen username is also taken
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'This username is already taken. Please choose another.' });
        }

        // Create the new user
        const newUser = await new User({
            googleId,
            username,
            email,
            avatar
        }).save();

        // Clear the pending profile from the session
        delete req.session.pendingProfile;

        // Log the new user in
        req.logIn(newUser, (err) => {
            if (err) {
                console.error('Error logging in after registration:', err);
                return res.status(500).json({ success: false, message: 'Login failed after registration.' });
            }
            // Send welcome email
            sendWelcomeEmail(newUser.email, newUser.username);
            return res.json({ success: true });
        });

    } catch (error) {
        console.error('Error completing registration:', error);
        res.status(500).json({ success: false, message: 'An internal error occurred.' });
    }
});

// Apply the rate limiter to the contact route
router.post('/contact', contactLimiter, async (req, res) => {
    const { name, email, message } = req.body;

    // Basic validation
    if (!name || !email || !message) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    // Length validation
    if (message.length > 5000) {
        return res.status(400).json({ message: 'Message is too long. Please limit it to 5000 characters.' });
    }

    try {
        // Sanitize the message to prevent XSS
        const sanitizedMessage = xss(message);

        await sendContactFormEmail(name, email, sanitizedMessage);
        res.status(200).json({ message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ message: 'Failed to send message.' });
    }
});


const searchCache = new Map();
// A simple in-memory cache to avoid spamming the Yahoo Finance API
const apiCache = new Map();

// In server/routes/api.js

// DELETE: Clear all notifications for the current user
router.delete('/notifications/clear', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated.' });
    }

    try {
        await Notification.deleteMany({ recipient: req.user._id });
        res.status(200).json({ message: 'All notifications cleared.' });
    } catch (err) {
        console.error("Error clearing notifications:", err);
        res.status(500).json({ message: 'Failed to clear notifications.' });
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

router.get('/market/key-assets', async (req, res) => {
    const fixedTickers = [
        { ticker: 'GC=F', name: 'Gold' },
        { ticker: 'BTC-USD', name: 'Bitcoin' },
        { ticker: 'ETH-USD', name: 'Ethereum' },
        { ticker: 'EURUSD=X', name: 'EUR/USD' },
    ];
    const magSevenTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'];
    const allTickers = [...fixedTickers.map(t => t.ticker), ...magSevenTickers];

    try {
        // Use the adapter to fetch all quotes
        const quotes = await financeAPI.getQuote(allTickers); // returns StandardQuote[] or []

        // If quotes array is empty due to API failure, return empty response
        if (quotes.length === 0) {
            console.warn("Market Assets: getQuote returned empty array, likely API issue.");
            return res.json([]);
        }

        // Separate the Magnificent Seven quotes
        const magSevenQuotes = quotes.filter(q => magSevenTickers.includes(q.symbol));

        // Find top 2 movers using standardized field names
        const topTwoMovers = magSevenQuotes
            .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0)) // Use standardized changePercent
            .slice(0, 2);

        // Combine fixed list with top movers
        const finalTickers = [
            ...fixedTickers.map(t => t.ticker),
            ...topTwoMovers.map(t => t.symbol)
        ];

        // Format the final list using standardized fields
        const assets = finalTickers.map(ticker => {
            const quote = quotes.find(q => q.symbol === ticker);
            if (!quote) return null; // Handle case where a quote might be missing

            const name = fixedTickers.find(t => t.ticker === ticker)?.name || quote.name || quote.symbol;

            return {
                ticker: quote.symbol,
                name: name,
                price: quote.price, // Use standardized price
                currency: quote.currency, // Use standardized currency
                percentChange: quote.changePercent, // Use standardized changePercent
                isUp: (quote.changeAbsolute ?? 0) >= 0 // Use standardized changeAbsolute
            };
        }).filter(a => a !== null); // Filter out any missing quotes

        res.json(assets);
    } catch (err) {
        console.error("Key assets fetch error:", err.message);
        res.json([]); // Send empty array on any unexpected error
    }
});

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

router.put('/profile/language', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated.' });
    }
    const { language } = req.body;

    // Validate that the language is one of the supported codes
    if (!['en', 'tr', 'de', 'es', 'zh', 'ru', 'fr'].includes(language)) {
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

// --- START: NEW AI WIZARD ROUTES ---

// Add this new route anywhere in the file.
router.get('/admin/ai-wizard-waitlist', async (req, res) => {
    // Security check
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }
    try {
        const waitlistEntries = await AIWizardWaitlist.find({})
            .sort({ createdAt: 'asc' }) // Show oldest signups first
            .populate('userId', 'username avatar isVerified'); // Get user details

        res.json(waitlistEntries);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching waitlist.' });
    }
});

// GET: Check if the current user is on the waitlist
router.get('/ai-wizard/waitlist-status', async (req, res) => {
    if (!req.user) {
        return res.json({ isOnWaitlist: false });
    }
    try {
        const entry = await AIWizardWaitlist.findOne({ userId: req.user.id });
        res.json({ isOnWaitlist: !!entry });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST: Add the current user to the waitlist
router.post('/ai-wizard/join-waitlist', async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'You must be logged in to join.' });
    }
    try {
        const existingEntry = await AIWizardWaitlist.findOne({ email: req.user.email });
        if (existingEntry) {
            return res.status(409).json({ message: 'You are already on the waitlist.' });
        }
        await new AIWizardWaitlist({ userId: req.user.id, email: req.user.email }).save();

        // Send confirmation email
        sendWaitlistConfirmationEmail(req.user.email);

        res.status(201).json({ message: 'Successfully joined the waitlist!' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});
// --- END: NEW AI WIZARD ROUTES ---

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

router.post('/posts/golden', async (req, res) => {
    if (!req.user || !req.user.isGoldenMember) {
        return res.status(403).json({ message: 'Only Golden Members can create posts.' });
    }

    const { message, attachedPrediction } = req.body;
    if (!message) {
        return res.status(400).json({ message: 'Post message cannot be empty.' });
    }

    try {
        const newPostData = {
            userId: req.user._id,
            message: purify.sanitize(message),
            isGoldenPost: true,
        };

        // --- Resilient Prediction Attachment Logic ---
        if (attachedPrediction && attachedPrediction.stockTicker) {
            let priceAtCreation = null;
            let currency = 'USD'; // Default currency

            try {
                // Attempt to fetch the quote
                const quote = await financeAPI.getQuote(attachedPrediction.stockTicker);
                priceAtCreation = quote.regularMarketPrice;
                currency = quote.currency;
            } catch (financeApiError) {
                // Log the non-critical error but continue
                console.warn(`Golden Post: Could not fetch price for ${attachedPrediction.stockTicker} at creation. Error: ${financeApiError.message}`);
                // priceAtCreation remains null
            }

            newPostData.attachedPrediction = {
                ...attachedPrediction,
                priceAtCreation: priceAtCreation, // Will be null if API failed
                currency: currency,
            };
        }
        // --- End of Resilient Logic ---

        const post = await new Post(newPostData).save();

        // --- Notification Logic (remains the same) ---
        const user = await User.findById(req.user._id).populate('goldenSubscribers.user');
        const validSubscribers = user.goldenSubscribers.filter(sub => sub.user);

        if (validSubscribers.length > 0) {
            const notificationMessage = `${user.username} has published a new Golden Post.`;
            const notifications = validSubscribers.map(sub => ({
                recipient: sub.user._id,
                sender: user._id,
                type: 'GoldenPost',
                messageKey: 'notifications.goldenPost', // Use a key
                link: '/golden-feed',
                metadata: {
                    username: user.username
                }
            }));
            await Notification.insertMany(notifications);
        }

        res.status(201).json(post);

    } catch (error) {
        // This catch is now only for critical database errors
        console.error("Critical error creating golden post:", error);
        res.status(500).json({ message: 'Server error while creating post.' });
    }
});

// server/routes/api.js
router.post('/quotes', async (req, res) => {
    const { tickers } = req.body;
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
        return res.status(400).json({ message: 'An array of tickers is required.' });
    }

    // Use individual fetches to prevent one failure from crashing the whole request
    const quotePromises = tickers.map(async (ticker) => {
        try {
            return await financeAPI.getQuote(ticker);
        } catch (err) {
            console.error(`Multi-quote: Failed to fetch quote for ${ticker}. Error: ${err.message}`);
            return null; // Return null for any ticker that fails
        }
    });

    // Wait for all promises to settle and filter out any that failed
    const quotes = (await Promise.all(quotePromises)).filter(q => q !== null);

    // Always send a successful response
    res.json(quotes);
});


router.get('/admin/all-users', async (req, res) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }

    try {
        const { sortBy = 'username', order = 'asc', isGoldenMember, isVerified } = req.query;

        // Whitelist valid sort fields to prevent injection
        const validSortKeys = [
            'avgScore', 'avgRating', 'goldenSubscribersCount', 'followingCount', // <-- 'avgScore' is valid
            'avgScore', 'goldenSubscribersCount', 'followingCount',
            'goldenSubscriptionsCount'
        ];

        // --- FIX: Remap old 'avgScore' to new 'avgRating' for sorting ---
        let sortKey = validSortKeys.includes(sortBy) ? sortBy : 'username';
        if (sortKey === 'avgScore') {
            sortKey = 'avgRating';
        }
        // --- END FIX ---
        const sortOrder = order === 'asc' ? 1 : -1;
        const sortQuery = { [sortKey]: sortOrder, username: 1 }; // Add username as a secondary sort

        // Build the initial match query (for categorical filters like 'isGoldenMember')
        const matchQuery = {};
        if (isGoldenMember === 'true') {
            matchQuery.isGoldenMember = true;
        }
        if (isVerified === 'true') { matchQuery.isVerified = true; }

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
                    avgRating: {
                        $cond: {
                            if: { $gt: [{ $size: "$predictions" }, 0] },
                            then: { $avg: { $ifNull: ["$predictions.rating", "$predictions.score"] } }, // <-- MIGRATE
                            else: 0
                        }
                    }
                }
            },
            {
                $project: {
                    username: 1, avatar: 1, isGoldenMember: 1, isVerified: 1,
                    verifiedAt: 1,
                    followersCount: 1, followingCount: 1,
                    goldenSubscribersCount: 1, goldenSubscriptionsCount: 1,
                    predictionCount: 1,
                    avgRating: { $round: ["$avgRating", 1] } // <-- Renamed
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

// POST: Handle contact form submission
router.post('/contact', async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        await sendContactFormEmail(name, email, message);
        res.status(200).json({ message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Contact form email error:', error);
        res.status(500).json({ message: 'Failed to send message.' });
    }
});

// New route for paginated predictions for a specific stock
router.get('/watchlist/:ticker/predictions', async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

    const { ticker } = req.params;
    const { page = 1, limit = 5 } = req.query; // Default to 5 predictions per page

    try {
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const query = { stockTicker: ticker.toUpperCase(), status: 'Active' };

        const totalItems = await Prediction.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limitNum);

        const predictions = await Prediction.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('userId', 'username avatar isGoldenMember totalRating isVerified')
            .lean();

        res.json({ predictions, totalPages, currentPage: pageNum });

    } catch (err) {
        console.error(`Error fetching paginated predictions for ${ticker}:`, err);
        res.status(500).json({ message: 'Error fetching prediction data.' });
    }
});

router.get('/watchlist', async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const user = await User.findById(req.user._id);
        const tickers = user.watchlist;

        if (!tickers || tickers.length === 0) {
            return res.json({ quotes: [], predictions: {}, recommendedUsers: {} });
        }

        let quotes = []; // Initialize quotes as an empty array
        try {
            // Attempt to fetch the quotes from the external API
            quotes = await financeAPI.getQuote(tickers);
        } catch (financeApiError) {
            // If the API fails, log the error but don't crash the request
            console.error("Watchlist: Non-critical error fetching quotes from Yahoo Finance. Sending empty quotes array.", financeApiError.message);
            // quotes remains an empty array, which is the desired fallback
        }

        // Fetch initial predictions (page 1) and recommended users for all watched stocks in parallel
        const dataPromises = tickers.map(async (ticker) => {
            const [predictionData, topPredictors, topVerified] = await Promise.all([
                // 1. Get FIRST PAGE of active predictions for this ticker
                Prediction.find({ stockTicker: ticker, status: 'Active' })
                    .sort({ createdAt: -1 })
                    .limit(5) // Hardcoded limit for the initial fetch
                    .populate('userId', 'username avatar isGoldenMember score isVerified')
                    .lean(),
                // 2. Get top 3 predictors overall for this ticker
                Prediction.aggregate([
                    { $match: { status: 'Assessed', stockTicker: ticker, userId: { $ne: req.user._id } } },
                    { $group: { _id: '$userId', avgScore: { $avg: '$score' } } },
                    { $sort: { avgScore: -1 } },
                    { $limit: 3 },
                    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                    { $unwind: '$user' },
                    { $project: { _id: '$user._id', username: '$user.username', avatar: '$user.avatar', isGoldenMember: '$user.isGoldenMember', isVerified: '$user.isVerified', avgRating: { $round: ['$avgRating', 1] }, acceptingNewSubscribers: '$user.acceptingNewSubscribers', goldenMemberPrice: '$user.goldenMemberPrice' } }
                ]),
                // 3. Get the single top verified predictor for this ticker
                Prediction.aggregate([
                    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
                    { $unwind: '$user' },
                    { $match: { status: 'Assessed', stockTicker: ticker, 'user.isVerified': true, userId: { $ne: req.user._id } } },
                    { $group: { _id: '$userId', avgScore: { $avg: '$score' } } },
                    { $sort: { avgScore: -1 } },
                    { $limit: 1 },
                    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                    { $unwind: '$user' },
                    { $project: { _id: '$user._id', username: '$user.username', avatar: '$user.avatar', isGoldenMember: '$user.isGoldenMember', isVerified: '$user.isVerified', avgRating: { $round: ['$avgRating', 1] } } }
                ])
            ]);

            // Get total count for pagination info
            const totalPredictions = await Prediction.countDocuments({ stockTicker: ticker, status: 'Active' });
            const totalPages = Math.ceil(totalPredictions / 5);

            // 4. Combine top predictors and the top verified user, removing duplicates
            let recommended = [...topPredictors];
            if (topVerified.length > 0) {
                const topVerifiedId = topVerified[0]._id.toString();
                if (!recommended.some(u => u._id.toString() === topVerifiedId)) {
                    recommended.push(topVerified[0]);
                }
            }

            return {
                ticker,
                predictions: {
                    items: predictionData,
                    totalPages,
                    currentPage: 1
                },
                recommendedUsers: recommended
            };
        });

        const results = await Promise.all(dataPromises);

        const predictionsByTicker = {};
        const recommendedUsersByTicker = {};
        results.forEach(result => {
            predictionsByTicker[result.ticker] = result.predictions;
            recommendedUsersByTicker[result.ticker] = result.recommendedUsers;
        });

        res.json({ quotes, predictions: predictionsByTicker, recommendedUsers: recommendedUsersByTicker });

    } catch (dbError) {
        console.error("Watchlist: Critical database error:", dbError);
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


router.put('/notification-settings', async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { notificationSettings: req.body } }, // Use the $set operator
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json(updatedUser.notificationSettings);
    } catch (err) {
        console.error("Error updating notification settings:", err); // Good for server logs
        res.status(500).json({ message: 'Error updating settings.' });
    }
});

router.get('/my-subscriptions', async (req, res) => {
    if (!req.user) return res.status(401).json([]);
    try {
        const currentUser = await User.findById(req.user._id)
            // FIX: Correctly populate the nested 'user' field within the 'goldenSubscriptions' array
            .populate({
                path: 'goldenSubscriptions',
                populate: {
                    path: 'user',
                    select: 'username' // We only need the username and id
                }
            });
        res.json(currentUser.goldenSubscriptions);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching subscriptions.' });
    }
});

// GET: The filterable, centralized Golden Feed
router.get('/golden-feed', async (req, res) => {
    if (!req.user) return res.status(401).json({ posts: [], totalPages: 0, currentPage: 1 });
    try {
        const { authorId, stock, predictionType, page = 1, limit = 20 } = req.query;
        const currentUser = await User.findById(req.user._id);
        const lastCheck = currentUser.lastCheckedGoldenFeed || new Date(0);

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        let authorIds = [currentUser._id, ...currentUser.goldenSubscriptions.map(sub => sub.user)];
        const query = { isGoldenPost: true };

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

        const totalItems = await Post.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limitNum);

        const feedPosts = await Post.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('userId', 'username avatar isGoldenMember isVerified')
            .lean();

        feedPosts.forEach(post => {
            post.isNew = new Date(post.createdAt) > new Date(lastCheck);
        });

        res.json({ posts: feedPosts, totalPages, currentPage: pageNum });
    } catch (err) {
        console.error("Error fetching golden feed:", err);
        res.status(500).json({ message: 'Error fetching golden feed.' });
    }
});

// POST: Mark the golden feed as "read" by updating the user's timestamp
router.post('/golden-feed/mark-as-read', async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    try {
        await User.findByIdAndUpdate(req.user._id, { lastCheckedGoldenFeed: new Date() });
        res.status(200).send('Timestamp updated.');
    } catch (err) {
        res.status(500).json({ message: 'Error updating timestamp.' });
    }
});

router.get('/posts/golden/:userId', async (req, res) => {
    try {
        const profileUserId = req.params.userId;
        let isAllowed = false;
        let posts = [];

        if (req.user) {
            const currentUserId = req.user._id.toString();
            const profileUser = await User.findById(profileUserId);
            if (!profileUser) return res.status(404).json({ message: 'User not found.' });

            const isOwner = currentUserId === profileUserId;

            // --- START: FIX ---
            // Added checks for 'sub' and 'sub.user' to prevent crashes on malformed data.
            const isSubscriber = profileUser.goldenSubscribers.some(
                sub => sub && sub.user && sub.user.toString() === currentUserId
            );
            // --- END: FIX ---

            if (isOwner || isSubscriber) {
                isAllowed = true;
                const currentUser = await User.findById(req.user._id);
                const lastCheck = currentUser.lastCheckedGoldenFeed;
                const rawPosts = await Post.find({ userId: profileUserId, isGoldenPost: true }).sort({ createdAt: -1 }).limit(50).lean();
                rawPosts.forEach(post => { post.isNew = new Date(post.createdAt) > new Date(lastCheck); });
                posts = rawPosts;
            }
        }

        res.json({ isAllowed, posts });
    } catch (err) {
        console.error("Error fetching profile golden feed:", err);
        res.status(500).json({ message: 'Server error while fetching feed.' });
    }
});

// POST: Like a prediction
router.post('/predictions/:id/like', actionLimiter, async (req, res) => {
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
router.post('/predictions/:id/dislike', actionLimiter, async (req, res) => {
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

        const trending = await financeAPI.getTrendingSymbols('US', { count: 6 });
        const tickers = trending.quotes.map(q => q.symbol);
        const quotes = await financeAPI.getQuote(tickers);

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


// In server/routes/api.js, replace your existing PUT '/settings/admin' route with this one.

router.put('/settings/admin', async (req, res) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).send('Forbidden: Admins only.');
    }
    try {
        const updateData = {};

        // This logic now correctly handles all settings sent from the admin page
        if (req.body.isPromoBannerActive !== undefined) {
            updateData.isPromoBannerActive = req.body.isPromoBannerActive;
        }
        if (req.body.badgeSettings) {
            updateData.badgeSettings = req.body.badgeSettings;
        }
        if (req.body.isVerificationEnabled !== undefined) {
            updateData.isVerificationEnabled = req.body.isVerificationEnabled;
        }
        if (req.body.verificationPrice !== undefined) {
            updateData.verificationPrice = req.body.verificationPrice;
        }
        // --- START: ADDED FIX ---
        // This check was missing. It will now save the AI Wizard setting.
        if (req.body.isAIWizardEnabled !== undefined) {
            updateData.isAIWizardEnabled = req.body.isAIWizardEnabled;
        }
        // --- ADD THIS BLOCK ---
        if (req.body.maxPredictionsPerDay !== undefined) {
            updateData.maxPredictionsPerDay = parseInt(req.body.maxPredictionsPerDay) || 10;
        }
        // --- END: ADDED FIX ---
        if (req.body.isFinanceApiEnabled !== undefined) { // <-- ADD THIS BLOCK
            updateData.isFinanceApiEnabled = req.body.isFinanceApiEnabled;
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

// --- NEW ENDPOINT: GET COMMUNITY SENTIMENT FOR A STOCK ---
router.get('/stock/:ticker/community-sentiment', async (req, res) => {
    try {
        const { ticker } = req.params;
        const upperTicker = ticker.toUpperCase();

        // 1. Get the current price using the financeAPI adapter
        let currentPrice = 0; // Default to 0
        try {
            const quote = await financeAPI.getQuote(upperTicker);
            if (quote) {
                currentPrice = quote.price;
            }
        } catch (quoteError) {
            console.warn(`(Sentiment) Non-critical: Failed to get quote for ${upperTicker}: ${quoteError.message}`);
        }

        // 2. Use MongoDB Aggregation to get average prices
        const sentiments = await Prediction.aggregate([
            {
                $match: {
                    stockTicker: upperTicker,
                    status: 'Active',
                    deadline: { $gt: new Date() } // Only future predictions
                }
            },
            {
                $group: {
                    _id: "$predictionType",
                    avgTargetPrice: { $avg: "$targetPrice" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    type: "$_id",
                    avgTargetPrice: "$avgTargetPrice",
                    count: 1
                }
            },
            { $sort: { count: -1 } } // Sort by most popular
        ]);

        const processedSentiments = sentiments.map(s => ({
            ...s,
            avgTargetPrice: s.avgTargetPrice ? parseFloat(s.avgTargetPrice.toFixed(2)) : 0
        }));

        res.json({
            ticker: upperTicker,
            currentPrice: currentPrice,
            sentiments: processedSentiments // <-- Use the processed results
        });

    } catch (err) {
        console.error(`Error fetching community sentiment for ${req.params.ticker}:`, err);
        res.status(500).json({ message: "Failed to fetch community sentiment." });
    }
});

// ===================================
// Original Prediction & User Routes
// ===================================

router.get('/scoreboard', async (req, res) => {
    try {
        const { predictionType = 'Overall', stock = '', page = 1, limit = 20 } = req.query;

        // --- START FIX ---
        const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limitNum = Math.min(parseInt(req.query.limit, 10) || 20, 50); // Default 20, Max 50
        // --- END FIX ---
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
                    avgRating: { $avg: { $ifNull: ["$rating", "$score"] } }, // <-- MIGRATE
                    predictionCount: { $sum: 1 }
                }
            },
            { $match: { predictionCount: { $gt: 0 } } }
        ];

        // Pipeline to get total count
        const countPipeline = [...basePipeline, { $count: 'total' }];
        const totalResult = await Prediction.aggregate(countPipeline);
        const totalItems = totalResult.length > 0 ? totalResult[0].total : 0;
        const totalPages = Math.ceil(totalItems / limitNum);

        // Pipeline to get the actual data
        const dataPipeline = [
            ...basePipeline,
            { $sort: { avgRating: -1 } }, // <-- Renamed
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
                    avgRating: { $round: ['$avgRating', 1] }, // <-- Renamed
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

// Get all active predictions for a stock
router.get('/predictions/:ticker', async (req, res) => {
    try {
        const predictions = await Prediction.find({
            stockTicker: req.params.ticker.toUpperCase(),
            status: 'Active'
        }).populate('userId', 'username'); // Show username instead of just ID
        res.json(predictions);
    } catch (err) {
        res.status(500).json({ message: "An internal server error occurred." });
    }
});

// This route handles creating new predictions and sending notifications

router.post('/predict', predictLimiter, async (req, res) => {
    if (!req.user) return res.status(401).send('You must be logged in.');

    try {
        const settings = await Setting.findOne();
        let user = await User.findById(req.user._id); // Fetch user initially

        const today = new Date().setHours(0, 0, 0, 0);
        const lastPredictionDay = user.lastPredictionDate ? new Date(user.lastPredictionDate).setHours(0, 0, 0, 0) : null;
        let dailyCountUpdate;

        // --- Daily Limit Check (remains the same) ---
        if (lastPredictionDay === today) {
            if (user.dailyPredictionCount >= settings.maxPredictionsPerDay) {
                return res.status(429).json({ /* ... limit reached error ... */ });
            }
            dailyCountUpdate = { $inc: { dailyPredictionCount: 1 } };
        } else {
            dailyCountUpdate = { $set: { dailyPredictionCount: 1, lastPredictionDate: new Date() } };
        }
        user = await User.findByIdAndUpdate(req.user._id, dailyCountUpdate, { new: true }).populate('followers', 'notificationSettings');
        // --- End Daily Limit Check ---

        const { stockTicker, targetPrice, deadline, predictionType, description } = req.body;
        const sanitizedDescription = xss(description);


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
            // currentPrice remains null
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
            description: sanitizedDescription, // <-- USE THIS
            initialDescription: sanitizedDescription,
            status: 'Active'
        });
        await prediction.save();

        // --- START: REAL-TIME UPDATE ---
        const io = req.app.get('io');
        if (io) {
            const updatedSentiment = await getCommunitySentiment(stockTicker);
            io.to(stockTicker.toUpperCase()).emit('sentiment-update', updatedSentiment);
        }
        // --- END: REAL-TIME UPDATE ---


        // --- Notification Logic (conditionally use percentageChange) ---
        const absPercentageChange = percentageChange !== null ? Math.abs(percentageChange) : 0;
        const thresholds = { Hourly: 3, Daily: 10, Weekly: 15, Monthly: 20, Quarterly: 40, Yearly: 100 };
        const isSignificant = percentageChange !== null && absPercentageChange > (thresholds[predictionType] || 999);
        const shortTermTypes = ['Hourly', 'Daily', 'Weekly'];
        const isShortTerm = shortTermTypes.includes(predictionType);

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
                    messageKey: 'notifications.newPrediction', // Use a translation key
                    link: `/prediction/${prediction._id}`,
                    metadata: { // Send raw data for frontend formatting
                        username: user.username,
                        stockTicker: stockTicker,
                        predictionType: predictionType,
                        ...(percentageChange !== null && { percentage: percentageChange })
                    }
                });
            }
        }

        if (notifications.length > 0) await Notification.insertMany(notifications);
        // --------------------------

        res.status(201).json(prediction);
    } catch (err) {
        // This is now only for critical errors like database issues
        console.error("Critical prediction error:", err);
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

    // 1. Check the cache first (this logic remains the same)
    if (searchCache.has(keyword)) {
        const cacheEntry = searchCache.get(keyword);
        if (Date.now() - cacheEntry.timestamp < 3600000) { // 1 hour cache
            console.log(`Serving search for "${keyword}" from cache.`);
            return res.json(cacheEntry.data);
        }
    }

    console.log(`Fetching search for "${keyword}" via Adapter.`);
    try {
        // 2. Call the adapter to get standardized results
        const adapterResults = await financeAPI.search(keyword); // Returns [{ symbol, name }, ...]

        // 3. Map the adapter results BACK to the format the frontend expects
        const frontendCompatibleData = {
            quotes: adapterResults.map(r => ({
                symbol: r.symbol,
                // Use the standardized 'name' for both shortname and longname
                shortname: r.name,
                longname: r.name,
                // Include isFallback if your adapter provides it
                // isFallback: r.isFallback 
            }))
        };

        // 4. Cache the frontend-compatible data
        const cacheEntry = { data: frontendCompatibleData, timestamp: Date.now() };
        searchCache.set(keyword, cacheEntry);

        // 5. Send the frontend-compatible data
        res.json(frontendCompatibleData);

    } catch (error) { // Catch errors from the adapter call itself (should be rare now)
        console.error(`CRITICAL Search API Error for "${keyword}":`, error);
        // Send an empty structure that the frontend expects
        res.json({ quotes: [] });
    }
});
// server/routes/api.js
router.get('/quote/:symbol', async (req, res) => {
    const symbol = req.params.symbol;
    try {
        const quote = await financeAPI.getQuote(symbol);
        const displayPrice = quote.regularMarketPrice || quote.marketPrice || quote.regularMarketPreviousClose || null;
        res.json({ ...quote, displayPrice });
    } catch (error) {
        console.error(`Quote API: Non-critical error for ${symbol}. Error: ${error.message}`);
        // Instead of a 500 error, send a successful response with null data.
        res.json(null);
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
        res.status(500).json({ message: "An internal server error occurred." });
    }
});


router.get('/profile/:userId', async (req, res) => {
    try {
        const isOwnProfile = req.user ? req.user.id === req.params.userId : false;
        const user = await User.findById(req.params.userId).select('-googleId');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let watchlistQuotes = [];
        if (user.watchlist && user.watchlist.length > 0) {
            try {

                watchlistQuotes = await financeAPI.getQuote(user.watchlist);
            } catch (quoteError) {
                console.error("Failed to fetch some watchlist quotes for profile:", quoteError.message);
            }
        }

        await user.populate(['goldenSubscriptions.user', 'goldenSubscribers.user']);

        // --- FIX: Manually migrate 'score' to 'rating' ---
        const predictionsData = await Prediction.find({ userId: req.params.userId }).sort({ createdAt: -1 }).lean();
        const predictions = predictionsData.map(p => {
            if (p.score !== undefined) {
                p.rating = p.score;
                delete p.score;
            }
            return p;
        });
        // --- END FIX ---
        const assessedPredictions = predictions.filter(p => p.status === 'Assessed');

        // This logic will now work because 'predictions' has the 'rating' field
        const overallRank = (await User.countDocuments({ totalRating: { $gt: user.totalRating } })) + 1;
        const totalRating = assessedPredictions.reduce((sum, p) => sum + p.rating, 0);
        let overallAvgRating = assessedPredictions.length > 0 ? Math.round((totalRating / assessedPredictions.length) * 10) / 10 : 0;

        // --- Start of Corrected Logic ---

        // 1. Initialize the performance object early
        const performance = {
            overallRank: overallRank,
            overallAvgRating,
        };

        // --- Helper function to calculate global rank for a specific category ---
        const getGlobalRank = async (field, value, userRating) => { // <-- Renamed
            const matchStage = { status: 'Assessed' };
            if (field && value) {
                matchStage[field] = value;
            }
            const rankData = await Prediction.aggregate([
                { $match: matchStage },
                { $group: { _id: '$userId', avgRating: { $avg: { $ifNull: ["$rating", "$score"] } } } }, // <-- MIGRATE
                { $match: { avgRating: { $gt: userRating } } }, // <-- Renamed
                { $count: 'higherRankedUsers' }
            ]);
            return (rankData[0]?.higherRankedUsers || 0) + 1;
        };

        // --- Calculate personal stats, NOW INCLUDING AGGRESSIVENESS ---
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
                acc[p.predictionType] = { totalRating: 0, count: 0, defensive: 0, neutral: 0, offensive: 0 }; // <-- Renamed
            }
            acc[p.predictionType].totalRating += p.rating; // <-- Renamed
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
                avgRating: data.totalRating / data.count, // <-- Renamed
                count: data.count,
                aggressivenessScore
            };
        }).sort((a, b) => b.avgRating - a.avgRating);

        const perfByStock = assessedPredictions.reduce((acc, p) => {
            if (!acc[p.stockTicker]) {
                acc[p.stockTicker] = { totalRating: 0, count: 0, defensive: 0, neutral: 0, offensive: 0 }; // <-- Renamed
            }
            acc[p.stockTicker].totalRating += p.rating; // <-- Renamed
            acc[p.stockTicker].count++;

            if (p.priceAtCreation > 0) {
                const absoluteChange = Math.abs((p.targetPrice - p.priceAtCreation) / p.priceAtCreation) * 100;
                // For stocks, we can use a general "weekly" threshold as a good average
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
                avgRating: data.totalRating / data.count, // <-- Renamed
                count: data.count,
                aggressivenessScore
            };
        }).sort((a, b) => b.avgRating - a.avgRating);

        // 2. Now calculate aggressiveness
        const aggressivenessData = { defensive: 0, neutral: 0, offensive: 0 };
        let totalAbsoluteChange = 0;
        let analyzedCount = 0;

        assessedPredictions.forEach(p => {
            if (p.priceAtCreation > 0) {
                analyzedCount++;
                const absoluteChange = Math.abs((p.targetPrice - p.priceAtCreation) / p.priceAtCreation) * 100;
                totalAbsoluteChange += absoluteChange;

                const typeThresholds = thresholds[p.predictionType] || { def: 5, neu: 15 }; // Default fallback

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

        // 3. Add the aggressiveness data to the existing object
        performance.aggressiveness = {
            distribution: aggressivenessData,
            overallScore: parseFloat(overallAggressiveness.toFixed(1)),
            analyzedCount: analyzedCount
        };

        // 4. Run all global rank calculations in parallel
        const rankPromisesByType = formattedPerfByType.map(p => getGlobalRank('predictionType', p.type, p.avgRating)); // <-- Renamed
        const rankPromisesByStock = formattedPerfByStock.map(s => getGlobalRank('stockTicker', s.ticker, s.avgRating)); // <-- Renamed
        const [resolvedRanksByType, resolvedRanksByStock] = await Promise.all([
            Promise.all(rankPromisesByType),
            Promise.all(rankPromisesByStock)
        ]);

        // 5. Combine personal stats with global ranks and add to performance object
        performance.byType = formattedPerfByType.map((p, index) => ({
            ...p,
            avgRating: Math.round(p.avgRating * 10) / 10, // <-- Renamed
            rank: resolvedRanksByType[index]
        }));
        performance.byStock = formattedPerfByStock.map((s, index) => ({
            ...s,
            avgRating: Math.round(s.avgRating * 10) / 10, // <-- Renamed
            rank: resolvedRanksByStock[index]
        }));

        // --- End of Corrected Logic ---

        const chartData = assessedPredictions.map(p => ({
            id: p._id, rating: p.rating, createdAt: p.createdAt, predictionType: p.predictionType, stockTicker: p.stockTicker // <-- ADD THIS LINE
        }));

        // --- NEW: Get total analyst rating from all users ---
        const totalRatingResult = await User.aggregate([
            { $group: { _id: null, total: { $sum: "$analystRating.total" } } }
        ]);
        const totalAnalystRating = totalRatingResult[0]?.total || 1; // Use 1 to prevent divide-by-zero

        const jsonResponse = {
            user, // user object now contains the full analystRating object
            watchlistQuotes,
            predictions,
            performance, // This now contains all performance data
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


router.put('/profile/golden-member', async (req, res) => {
    if (!req.user) return res.status(401).send('You must be logged in.');

    try {
        const { isGoldenMember, price, description, acceptingNewSubscribers } = req.body;
        const userId = req.user._id;

        // Fetch the user *before* making updates to check current state
        let userToUpdate = await User.findById(userId).populate('goldenSubscribers.user');
        if (!userToUpdate) return res.status(404).json({ message: "User not found." });

        const wasGoldenBefore = userToUpdate.isGoldenMember;

        // --- Deactivation Logic ---
        if (wasGoldenBefore && isGoldenMember === false) {
            console.log(`Deactivating Golden status for user ${userId}`);

            const validSubscribers = userToUpdate.goldenSubscribers.filter(sub => sub.user);
            const subscriberIds = validSubscribers.map(sub => sub.user._id);

            if (subscriberIds.length > 0) {
                // Remove this user from each subscriber's 'goldenSubscriptions' list
                await User.updateMany(
                    { _id: { $in: subscriberIds } },
                    { $pull: { goldenSubscriptions: { user: userId } } }
                );

                // --- START FIX ---
                const oldPriceId = userToUpdate.goldenMemberPriceId; // Get the user's price ID

                // Find all active Stripe subscriptions for this creator's price
                let subscriptions = { data: [] }; // Default to empty
                if (oldPriceId) {
                    subscriptions = await stripe.subscriptions.list({
                        price: oldPriceId, // <-- CORRECTED PARAMETER
                        status: 'active'
                    });
                } else {
                    console.log(`User ${userId} has no oldPriceId, skipping subscriber cancellation loop.`);
                }
                // --- END FIX ---

                // Loop and cancel each one. This will trigger the webhook for each subscriber.
                for (const sub of subscriptions.data) {
                    try {
                        await stripe.subscriptions.cancel(sub.id);
                    } catch (err) {
                        console.error(`Failed to cancel subscription ${sub.id} for user ${userId} deactivation:`, err);
                    }
                }
                console.log(`Triggered Stripe cancellation for ${subscriptions.data.length} subscribers.`);
            }

            // Prepare update data for deactivation
            let updateData = {
                isGoldenMember: false,
                goldenMemberPrice: price, // Keep price setting even if inactive
                goldenMemberDescription: description,
                acceptingNewSubscribers: acceptingNewSubscribers,
                goldenSubscribers: [], // Clear subscribers list on deactivation
                goldenMemberPriceId: null, // Clear Stripe Price ID
                // Keep stripeConnectAccountId and stripeConnectOnboardingComplete
            };

            const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true });

            // --- CORRECTED EMAIL PLACEMENT ---
            console.log(`Golden status DEACTIVATED for user ${userId}. Sending email.`);
            sendGoldenDeactivationEmail(updatedUser.email, updatedUser.username);
            // --- END ---

            return res.json(updatedUser); // Exit early after deactivation
        }

        // --- Activation / Update Logic ---
        if (isGoldenMember === true) {
            console.log(`Processing Golden activation/update for user ${userId}`);
            let updateData = {
                isGoldenMember: true,
                goldenMemberPrice: price,
                goldenMemberDescription: description,
                acceptingNewSubscribers: acceptingNewSubscribers,
                // Don't clear subscribers on update/activation
            };

            // Check if Stripe onboarding is complete BEFORE trying to create/update price
            if (userToUpdate.stripeConnectAccountId && userToUpdate.stripeConnectOnboardingComplete) {
                console.log(`User ${userId} is onboarded. Creating/Updating Stripe Price.`);

                // --- START: PRICE CHANGE LOGIC ---
                const oldPrice = userToUpdate.goldenMemberPrice;
                const newPrice = parseFloat(price);
                let newPriceId;

                // Check if the price has actually changed and the user is already Golden
                if (wasGoldenBefore && newPrice !== oldPrice) {
                    console.log(`Price change detected for ${userId}: from $${oldPrice} to $${newPrice}`);

                    // --- START FIX (This block is already correct) ---
                    const oldPriceId = userToUpdate.goldenMemberPriceId; // Get the *old* price ID
                    if (!oldPriceId) {
                        console.error(`Cannot change price for user ${userId}: Old Price ID is missing.`);
                        return res.status(500).json({ message: "Cannot update subscribers: Old Price ID not found." });
                    }

                    // 1. Find all active Stripe subscriptions for this creator's OLD price
                    const subscriptions = await stripe.subscriptions.list({
                        price: oldPriceId, // <-- CORRECTED PARAMETER
                        status: 'active'
                    });
                    // --- END FIX ---

                    // 2. Create the new Stripe Price
                    newPriceId = await createOrUpdateStripePriceForUser(userId, newPrice, userToUpdate.username);


                    // 3. Notify subscribers and update their subscriptions
                    for (const sub of subscriptions.data) {
                        // --- FIX: Check for metadata on subscription ---
                        // Stripe does not guarantee metadata on list.
                        // We must retrieve the full subscription object to get metadata.
                        const fullSub = await stripe.subscriptions.retrieve(sub.id);
                        const payingUserId = fullSub.metadata.payingUserId;

                        if (!payingUserId) {
                            console.warn(`Subscription ${fullSub.id} is missing payingUserId in metadata. Skipping notification.`);
                            continue;
                        }

                        const subscriber = await User.findById(payingUserId);
                        // --- END FIX ---

                        if (subscriber) {

                            // --- START FIX (Robust Date) ---
                            const periodEndTimestamp = sub.current_period_end;
                            let effectiveDate = "an upcoming billing cycle"; // A safe fallback

                            if (typeof periodEndTimestamp === 'number') {
                                effectiveDate = new Date(periodEndTimestamp * 1000).toLocaleDateString(subscriber.language || 'en-US', {
                                    year: 'numeric', month: 'long', day: 'numeric'
                                });
                            } else {
                                console.error(`Could not determine effectiveDate for sub ${sub.id}, timestamp was: ${periodEndTimestamp}`);
                            }
                            // --- END FIX ---

                            // 3a. Send the email
                            sendPriceChangeEmail(subscriber.email, subscriber.username, userToUpdate.username, oldPrice, newPrice, effectiveDate);

                            // 3b. Send in-app notification
                            await new Notification({
                                recipient: subscriber._id,
                                sender: userId,
                                type: 'PriceChange', // Correct type
                                messageKey: 'notifications.priceChange',
                                link: '/profile/' + userId,
                                metadata: {
                                    creatorName: userToUpdate.username,
                                    oldPrice: oldPrice.toFixed(2),
                                    newPrice: newPrice.toFixed(2),
                                    effectiveDate: effectiveDate
                                }
                            }).save();

                            // 3c. Update the subscription in Stripe to use the new price
                            await stripe.subscriptions.update(sub.id, {
                                items: [{
                                    id: sub.items.data[0].id,
                                    price: newPriceId,
                                }],
                                proration_behavior: 'none' // This makes it apply at the next billing cycle
                            });
                        }
                    }
                } else {
                    // This is a new activation or just a description change, set the price normally.
                    newPriceId = await createOrUpdateStripePriceForUser(userId, newPrice, userToUpdate.username);
                }
                // --- END: PRICE CHANGE LOGIC ---

                updateData.goldenMemberPriceId = newPriceId;

            } else {
                // Onboarding not complete, activate status in DB but warn/inform user
                console.log(`User ${userId} activating Golden status, but Stripe onboarding is pending. Price ID not set yet.`);
                updateData.goldenMemberPriceId = null; // Ensure price ID is null if onboarding isn't done
            }

            const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true });
            console.log(`Golden status activated/updated for user ${userId}.`);

            // --- CORRECTED EMAIL PLACEMENT ---
            // Send email only if they weren't golden before and are now.
            if (!wasGoldenBefore && updatedUser.isGoldenMember) {
                console.log(`User was not golden before. Sending ACTIVATION email.`);
                sendGoldenActivationEmail(updatedUser.email, updatedUser.username);
            }
            // --- END ---

            return res.json(updatedUser);
        }

        // Fallback for cases where isGoldenMember might not be explicitly true/false in request? Unlikely.
        return res.status(400).json({ message: "Invalid request data." });

    } catch (err) {
        // Handle validation errors specifically
        if (err.name === 'ValidationError') {
            // Check specifically for price range error
            if (err.errors.goldenMemberPrice) {
                return res.status(400).json({ message: 'Price must be between $1 and $500.' });
            }
            // Generic validation error
            return res.status(400).json({ message: err.message });
        }
        // Handle other errors
        console.error("Error in PUT /profile/golden-member:", err);
        res.status(500).json({ message: 'Failed to update settings due to a server error.' });
    }
});

// from server/routes/api.js
router.put('/profile', async (req, res) => {
    if (!req.user) {
        return res.status(401).send('You must be logged in.');
    }
    try {
        const { username, about, youtubeLink, xLink, avatar, telegramLink } = req.body;

        // --- START FIX: Use xss() instead of purify.sanitize() ---
        const sanitizedUpdate = {
            username: xss(username),
            about: xss(about),
            youtubeLink: xss(youtubeLink),
            xLink: xss(xLink),
            telegramLink: xss(telegramLink),
            avatar: xss(avatar)
        };
        // --- END FIX ---

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            sanitizedUpdate,
            { new: true, runValidators: true }
        );
        res.json(updatedUser);
    } catch (err) {
        // Also add the username check we discussed
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: 'Username cannot be empty.' });
        }
        console.error("Error in PUT /profile:", err);
        res.status(500).json({ message: 'Failed to update profile.' });
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
        const endDate = new Date(); // Today

        const period1String = startDate.toISOString().split('T')[0];
        const period2String = endDate.toISOString().split('T')[0];

        const result = await financeAPI.getHistorical(ticker, {
            period1: period1String,
            period2: period2String,
        });

        res.json(result);
    } catch (error) {
        console.error(`Finance API historical error for ${ticker}:`, error.message);
        res.status(500).json({ message: "Error fetching historical data" });
    }
});

// Add this to api.js
// In server/routes/api.js

router.post('/users/:userId/follow', actionLimiter, async (req, res) => {
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
            messageKey: 'notifications.newFollower', // Corrected from message
            link: `/profile/${currentUserId}`,
            metadata: {
                username: req.user.username
            }
        }).save();
        // ---------------------------------------------------------

        res.status(200).send('Successfully followed user.');
    } catch (error) {
        res.status(500).json({ message: 'Error following user.' });
    }
});

router.post('/users/:userId/unfollow', actionLimiter, async (req, res) => {
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
            .populate('userId', 'username avatar isGoldenMember isVerified');

        const formattedWinners = winners.map(p => ({
            predictionId: p._id,
            userId: p.userId._id,
            username: p.userId.username,
            avatar: p.userId.avatar, // Add avatar
            isGoldenMember: p.userId.isGoldenMember, // Add golden status
            isVerified: p.userId.isVerified,
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
            { $group: { _id: '$userId', avgRating: { $avg: { $ifNull: ["$rating", "$score"] } } } }, // <-- MIGRATE
            { $sort: { avgRating: -1 } }, // <-- RENAME
            { $limit: 3 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            {
                $project: {
                    userId: '$_id',
                    username: '$user.username',
                    avgRating: { $round: ['$avgRating', 1] }, // <-- Renamed
                    avatar: '$user.avatar',                 // Add avatar
                    isGoldenMember: '$user.isGoldenMember', // Add golden status
                    isVerified: '$user.isVerified',
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
            { $group: { _id: '$userId', avgRating: { $avg: { $ifNull: ["$rating", "$score"] } } } }, // <-- MIGRATE
            { $sort: { avgRating: -1 } }, // <-- RENAME
            { $limit: 3 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            {
                $project: {
                    userId: '$_id',
                    username: '$user.username',
                    avgRating: { $round: ['$avgRating', 1] }, // <-- Renamed
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

// Helper function for the widget
const getSentimentForTicker = async (ticker) => {
    try {
        let currentPrice = 0; // Default to 0
        try {
            const quote = await financeAPI.getQuote(ticker);
            if (quote) {
                currentPrice = quote.price;
            }
        } catch (quoteError) {
            console.warn(`(FamousStocks) Non-critical: Failed to get quote for ${ticker}: ${quoteError.message}`);
        }

        const sentiments = await Prediction.aggregate([
            { $match: { stockTicker: ticker, status: 'Active', deadline: { $gt: new Date() } } },
            {
                $group: {
                    _id: "$predictionType",
                    avgTargetPrice: { $avg: "$targetPrice" },
                    count: { $sum: 1 }
                }
            },
            { $project: { _id: 0, type: "$_id", avgTargetPrice: "$avgTargetPrice", count: 1 } },
            { $sort: { count: -1 } } // Sort by most popular
        ]);

        // Find the most relevant sentiment (Daily or Weekly)
        const daily = sentiments.find(s => s.type === 'Daily');
        const weekly = sentiments.find(s => s.type === 'Weekly');

        let relevantSentiment = [];
        if (daily) {
            relevantSentiment.push(daily);
        } else if (weekly) {
            relevantSentiment.push(weekly);
        }

        // Round the numbers in JavaScript before returning
        const processedSentiments = relevantSentiment.map(s => ({
            ...s,
            avgTargetPrice: s.avgTargetPrice ? parseFloat(s.avgTargetPrice.toFixed(2)) : 0
        }));

        return {
            currentPrice: currentPrice,
            sentiments: processedSentiments // <-- Use processed results
        };
    } catch (err) {
        console.error(`Error in getSentimentForTicker for ${ticker}:`, err);
        return { currentPrice: 0, sentiments: [] };
    }
};

router.post('/prediction/:id/view', viewLimiter, async (req, res) => {
    try {
        // Use findByIdAndUpdate with $inc to atomically increment the views field.
        // We don't need to wait for the result or send anything back.
        Prediction.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();
        // Respond immediately with 202 Accepted.
        res.status(202).send();
    } catch (err) {
        // This will only catch critical errors if the DB is down, etc.
        // We still send a success-like status to not block the client.
        res.status(202).send();
    }
});

// GET Famous (Trending) Stocks
router.get('/widgets/famous-stocks', async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0); // Use UTC for consistency

        let stocks = await Prediction.aggregate([
            { $match: { createdAt: { $gte: startOfDay } } }, // Find predictions made today
            { $group: { _id: '$stockTicker', predictions: { $sum: 1 } } },
            { $sort: { predictions: -1 } },
            { $limit: 4 },
            { $project: { ticker: '$_id', predictions: 1, _id: 0 } }
        ]);

        let isHistorical = false;

        // If no stocks were predicted today, try the last 7 days
        if (stocks.length === 0) {
            isHistorical = true;
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7); // Use UTC
            sevenDaysAgo.setUTCHours(0, 0, 0, 0);

            stocks = await Prediction.aggregate([
                { $match: { createdAt: { $gte: sevenDaysAgo } } }, // Find predictions in the last 7 days
                { $group: { _id: '$stockTicker', predictions: { $sum: 1 } } },
                { $sort: { predictions: -1 } },
                { $limit: 4 },
                { $project: { ticker: '$_id', predictions: 1, _id: 0 } }
            ]);
        }

        // --- NEW FIX: Enrich stocks with quote data ---
        if (stocks.length > 0) {
            const tickers = stocks.map(s => s.ticker);
            try {
                // Call the adapter to get all quotes at once
                const quotes = await financeAPI.getQuote(tickers);

                // Create a map for easy lookup
                const quoteMap = new Map();
                quotes.forEach(q => {
                    if (q) quoteMap.set(q.symbol, q);
                });

                // Merge quote data into the stocks array
                stocks = stocks.map(stock => ({
                    ...stock,
                    // Find the quote in the map
                    quote: quoteMap.get(stock.ticker) || null
                }));

            } catch (quoteError) {
                console.error("Failed to fetch quotes for famous stocks:", quoteError.message);
                // If quotes fail, send stocks without quote data so frontend doesn't crash
                stocks.forEach(s => s.quote = null);
            }
        }
        // --- END FIX ---

        // Send the stocks (now enriched with quote data) and the flag
        res.json({ stocks, isHistorical });

    } catch (err) {
        console.error("Error fetching famous stocks:", err);
        // Send empty on error to prevent frontend crash
        res.json({ stocks: [], isHistorical: false });
    }
});


// GET Community Feed (most recent predictions) - UPDATED
router.get('/widgets/community-feed', async (req, res) => {
    try {
        const predictions = await Prediction.find({ status: 'Active' })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('userId', 'username avatar isGoldenMember')
            .lean();


        // Fetch current prices for the tickers in the feed for comparison
        const tickers = [...new Set(predictions.map(p => p.stockTicker))];
        const quotes = await financeAPI.getQuote(tickers);
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
        const isOwnProfile = req.user ? req.user.id === req.params.userId : false;

        // 1. Fetch user and populate public lists that everyone can see
        const user = await User.findById(req.params.userId)
            // MODIFIED: Added 'createdAt' to the selection
            .populate('followers', 'username avatar isGoldenMember isVerified score createdAt')
            .populate('following', 'username avatar isGoldenMember isVerified score createdAt');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 2. Conditionally populate private lists only for the owner
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

        // 3. Helper function to efficiently get average scores for all involved users
        const getScoresForUserIds = async (userIds) => {
            if (userIds.length === 0) return new Map();
            const results = await Prediction.aggregate([
                { $match: { userId: { $in: userIds }, status: 'Assessed' } },
                { $group: { _id: '$userId', avgRating: { $avg: { $ifNull: ["$rating", "$score"] } } } } // <-- MIGRATE
            ]);
            // MODIFIED: Removed Math.round() to keep decimal precision
            return new Map(results.map(r => [r._id.toString(), r.avgRating])); // <-- Renamed
        };

        // 4. Gather all unique IDs from the lists
        const allUserIds = [
            ...user.followers.map(u => u._id),
            ...user.following.map(u => u._id),
            ...(isOwnProfile ? user.goldenSubscribers.filter(sub => sub.user).map(sub => sub.user._id) : []),
            ...(isOwnProfile ? user.goldenSubscriptions.filter(sub => sub.user).map(sub => sub.user._id) : [])
        ];
        const uniqueUserIds = [...new Set(allUserIds)];
        const scoresMap = await getScoresForUserIds(uniqueUserIds);

        // 5. Helper function to combine user data with their calculated score
        const combineUserDataWithScore = (userData) => ({
            ...userData.toObject(),
            avgRating: scoresMap.get(userData._id.toString()) || 0 // <-- Renamed
        });

        // 6. Build and send the final response
        res.json({
            profileUser: { username: user.username, isGoldenMember: user.isGoldenMember },
            followers: user.followers.map(combineUserDataWithScore),
            following: user.following.map(combineUserDataWithScore),
            goldenSubscribers: isOwnProfile ? user.goldenSubscribers
                .filter(sub => sub.user)
                .map(sub => ({
                    ...combineUserDataWithScore(sub.user), // This now returns avgRating
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

router.get('/stock/:ticker', async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    try {
        let quote = null;
        try {
            quote = await financeAPI.getQuote(ticker);
        } catch (financeApiError) {
            console.error(`StockPage: Non-critical error fetching quote for ${ticker}. Error: ${financeApiError.message}`);
        }
        res.json({ quote }); // Only send the quote
    } catch (dbError) {
        console.error(`Error fetching data for stock ${ticker}:`, dbError);
        res.status(500).json({ message: "Failed to fetch stock data" });
    }
});

// GET: The details for a single prediction
router.get('/prediction/:id', async (req, res) => {
    try {
        const prediction = await Prediction.findById(req.params.id)
            // FIX: Add 'isGoldenMember' to the fields being populated
            .populate('userId', 'username avatar isGoldenMember isVerified');

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
        // Remove current user from the golden member's subscriber list
        await User.findByIdAndUpdate(goldenMemberId, { $pull: { goldenSubscribers: currentUserId } });
        // Remove golden member from the current user's subscription list
        await User.findByIdAndUpdate(currentUserId, { $pull: { goldenSubscriptions: goldenMemberId } });

        res.status(200).send('Successfully canceled subscription.');
    } catch (error) {
        res.status(500).json({ message: 'Error canceling subscription.' });
    }
});


router.get('/explore/feed', async (req, res) => {
    const { status = 'Active', stock, predictionType, sortBy = 'date', verifiedOnly, page = 1, limit = 20 } = req.query;

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

        // Pipeline to get the total count for pagination
        const countPipeline = [...pipeline, { $count: 'total' }];
        const totalResult = await Prediction.aggregate(countPipeline);
        const totalItems = totalResult.length > 0 ? totalResult[0].total : 0;
        const totalPages = Math.ceil(totalItems / limitNum);

        // Main data pipeline
        if (sortBy === 'performance' || sortBy === 'votes') {
            let sortStage = {};
            if (sortBy === 'performance') {
                sortStage = { 'userDetails.totalRating': -1, createdAt: -1 }; // <-- Use totalRating
            } else { // sortBy === 'votes'
                sortStage = { voteScore: -1, createdAt: -1 };
            }
            if (verifiedOnly !== 'true') {
                pipeline.push(
                    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userDetails' } },
                    { $unwind: '$userDetails' }
                );
            }
            pipeline.push(
                { $addFields: { voteScore: { $subtract: [{ $size: { $ifNull: ["$likes", []] } }, { $size: { $ifNull: ["$dislikes", []] } }] } } },
                { $sort: sortStage },
                { $skip: skip },
                { $limit: limitNum },
                {
                    $project: {
                        _id: 1, stockTicker: 1, targetPrice: 1, predictionType: 1, deadline: 1, status: 1,
                        rating: { $ifNull: ["$rating", "$score"] }, // <-- MIGRATE
                        actualPrice: 1, createdAt: 1, description: 1, priceAtCreation: 1, likes: 1, dislikes: 1,
                        userId: {
                            _id: '$userDetails._id', username: '$userDetails.username', avatar: '$userDetails.avatar',
                            isGoldenMember: '$userDetails.isGoldenMember', totalRating: '$userDetails.totalRating', isVerified: '$userDetails.isVerified'
                        }
                    }
                }
            );
            const predictions = await Prediction.aggregate(pipeline);
            return res.json({ predictions, totalPages, currentPage: pageNum });
        } else {
            // Standard find for date-based sorting
            const initialPredictions = await Prediction.aggregate(pipeline.concat([{ $project: { _id: 1 } }]));
            const initialPredictionIds = initialPredictions.map(p => p._id);

            const predictions = await Prediction.find({ _id: { $in: initialPredictionIds } })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('userId', 'username avatar isGoldenMember totalRating isVerified') // <-- Renamed
                .lean();

            // --- FIX: Manually migrate 'score' to 'rating' ---
            const migratedPredictions = predictions.map(p => {
                if (p.score !== undefined) {
                    p.rating = p.score;
                    delete p.score;
                }
                return p;
            });
            // --- END FIX --

            // --- START: MODIFY THIS BLOCK ---
            if (status === 'Active' && migratedPredictions.length > 0) {
                // 1. Find unique tickers from the prediction list
                const tickers = [...new Set(migratedPredictions.map(p => p.stockTicker))];

                try {
                    if (tickers.length > 0) {
                        // 2. Make ONE call to our (now cached) getQuote function
                        const quotes = await financeAPI.getQuote(tickers);

                        // 3. Create a simple map for fast lookups
                        const priceMap = new Map(quotes.map(q => [q.symbol, q.price]));

                        // 4. Attach the currentPrice to each prediction
                        migratedPredictions.forEach(p => {
                            p.currentPrice = priceMap.get(p.stockTicker) || 0;
                        });
                    }
                } catch (quoteError) {
                    console.error("Non-critical error: Failed to fetch live quotes for explore feed.", quoteError.message);
                    predictions.forEach(p => { p.currentPrice = 0; });
                }
            }
            // --- END: MODIFY THIS BLOCK ---
            return res.json({ predictions: migratedPredictions, totalPages, currentPage: pageNum });
        }
    } catch (err) {
        console.error(`CRITICAL Error fetching explore feed:`, err);
        res.status(500).json({ message: 'Server error fetching prediction data.' });
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
                // --- FIX: Use migration logic to read 'rating' or 'score' ---
                const totalRating = userPredictions.reduce((sum, p) => sum + (p.rating || p.score || 0), 0);
                const overallAvgRating = totalRating / userPredictions.length;
                // --- END FIX ---

                await awardBadges(user, { overallAvgRating });
            }
        }

        console.log(`--- Badge recalculation completed for ${allUsers.length} users. ---`);
        res.status(200).send('Successfully recalculated badges for all users.');

    } catch (error) {
        console.error("Error during badge recalculation:", error);
        res.status(500).send('An error occurred during recalculation.');
    }
});

// --- NEW LEADERBOARD ENDPOINT ---
router.get('/leaderboard/rating', async (req, res) => {
    try {
        const users = await User.find({ 'analystRating.total': { $gt: 0 } })
            .sort({ 'analystRating.total': -1 })
            .limit(100)
            .select('username avatar analystRating'); // Select the whole object

        const totalRatingResult = await User.aggregate([
            { $group: { _id: null, total: { $sum: "$analystRating.total" } } }
        ]);
        const totalAnalystRating = totalRatingResult[0]?.total || 1; // Use 1 to prevent divide-by-zero

        // We need to re-map the users to just send the total for the main list
        const leaderboardUsers = users.map(u => ({
            _id: u._id,
            username: u.username,
            avatar: u.avatar,
            analystRating: u.analystRating, // Send only the total for the list
            ratingBreakdown: u.analystRating // Send the full breakdown for the pie chart
        }));

        res.json({ users: leaderboardUsers, totalAnalystRating });
    } catch (err) {
        res.status(500).json({ message: "Error fetching rating leaderboard." });
    }
});

module.exports = router;