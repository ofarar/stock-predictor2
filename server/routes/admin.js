const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Prediction = require('../models/Prediction');
const JobLog = require('../models/JobLog');
const runAssessmentJob = require('../jobs/assessment-job');
const { runEarningsModel } = require('../jobs/botScheduler');
const { awardBadges } = require('../services/badgeService');
const mongoose = require('mongoose');
const financeAPI = require('../services/financeAPI');
const axios = require('axios');
const { transporter } = require('../services/email');
const PredictionLog = require('../models/PredictionLog');
const Setting = require('../models/Setting');
const cryptoProvider = require('../services/financeProviders/cryptoProvider');
const { recalculateUserAnalytics } = require('../services/analyticsService');

// --- NEW UTILITY FUNCTION: Deletes predictions without matching users ---
async function cleanupOrphanedPredictions() {
    // 1. Get all valid User IDs
    // Lean() and select('_id') are used for performance as we only need the IDs
    const allUserIds = await User.find().select('_id').lean().exec();
    const validIds = allUserIds.map(user => user._id);

    // 2. Delete all Prediction documents whose userId is NOT in the list of valid IDs ($nin)
    const result = await Prediction.deleteMany({
        userId: { $nin: validIds }
    });

    // 3. Return the count of deleted documents
    return result.deletedCount;
}

// POST: Manually trigger assessment job
router.post('/admin/evaluate', async (req, res) => {
    if (!req.user || (!req.user.isAdmin && req.user.email !== 'ofarar@gmail.com')) {
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

// POST: Manually trigger Bot Run
router.post('/admin/trigger-bot', async (req, res) => {
    if (!req.user || (!req.user.isAdmin && req.user.email !== 'ofarar@gmail.com')) {
        return res.status(403).send('Forbidden: Admins only.');
    }
    try {
        const { mode } = req.body; // 'inference' or 'train'
        const safeMode = ['train', 'inference'].includes(mode) ? mode : 'inference';
        console.log(`Admin triggered manual AI Bot Run (Mode: ${safeMode})...`);
        runEarningsModel(safeMode);
        res.status(200).send(`AI Bot (${safeMode}) job triggered successfully.`);
    } catch (error) {
        res.status(500).send('Failed to trigger bot.');
    }
});

// POST: Recalculate analytics for all users
router.post('/admin/recalculate-analytics', async (req, res) => {
    if (!req.user || (!req.user.isAdmin && req.user.email !== 'ofarar@gmail.com')) {
        return res.status(403).send('Forbidden: Admins only.');
    }

    try {
        console.log('--- Admin triggered ANALYTICS recalculation for all users ---');

        const allUsers = await User.find({}).populate('followers');

        for (const user of allUsers) {
            if (!user.email) {
                console.warn(`Skipping user with ID ${user._id} because they are missing an email.`);
                continue;
            }
            await recalculateUserAnalytics(user);
        }
        console.log(`--- Analytics recalculation completed for ${allUsers.length} users. ---`);
        res.status(200).send('Successfully recalculated analytics for all users.');

    } catch (error) {
        console.error("Error during badge recalculation:", error);
        res.status(500).send('An error occurred during recalculation.');
    }
});

router.post('/admin/cleanup-orphans', async (req, res) => {
    if (!req.user || (!req.user.isAdmin && req.user.email !== 'ofarar@gmail.com')) {
        return res.status(403).send('Forbidden: Admins only.');
    }
    try {
        console.log('Admin triggered cleanup of orphaned predictions...');
        const deletedCount = await cleanupOrphanedPredictions();

        res.status(200).json({
            message: `${deletedCount} orphaned predictions deleted successfully.`,
            deletedCount: deletedCount
        });
    } catch (error) {
        console.error("Error during orphan cleanup:", error);
        res.status(500).send('Failed to run orphan cleanup job.');
    }
});

// DELETE: Delete a prediction (Admin only)
router.delete('/admin/predictions/:id', async (req, res) => {
    if (!req.user || (!req.user.isAdmin && req.user.email !== 'ofarar@gmail.com')) {
        return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }

    try {
        const { id } = req.params;
        const prediction = await Prediction.findById(id);

        if (!prediction) {
            return res.status(404).json({ message: 'Prediction not found.' });
        }

        const userId = prediction.userId;
        const isAssessed = prediction.status === 'Assessed';

        await Prediction.findByIdAndDelete(id);

        if (isAssessed) {
            const user = await User.findById(userId);
            if (user) {
                await recalculateUserAnalytics(user);
            }
        }

        res.json({ message: 'Prediction deleted successfully.' });
    } catch (error) {
        console.error("Error deleting prediction:", error);
        res.status(500).json({ message: 'Failed to delete prediction.' });
    }
});

// GET: Fetch pending predictions (Admin only)
router.get('/admin/predictions/pending', async (req, res) => {
    if (!req.user || (!req.user.isAdmin && req.user.email !== 'ofarar@gmail.com')) {
        return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }
    try {
        const predictions = await Prediction.find({ status: 'Pending' })
            .populate('userId', 'username avatar isBot')
            .sort({ createdAt: -1 });
        res.json(predictions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pending predictions.' });
    }
});

// PUT: Approve or Reject a prediction
router.put('/admin/predictions/:id/status', async (req, res) => {
    if (!req.user || (!req.user.isAdmin && req.user.email !== 'ofarar@gmail.com')) {
        return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }
    const { status } = req.body;
    if (!['Active', 'Rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status update.' });
    }
    try {
        const prediction = await Prediction.findByIdAndUpdate(
            req.params.id,
            { status: status },
            { new: true }
        );
        res.json(prediction);
    } catch (error) {
        res.status(500).json({ message: 'Error updating prediction status.' });
    }
});

// GET: Fetch all users (Admin only)
router.get('/admin/all-users', async (req, res) => {
    // HOTFIX: Allow 'ofarar@gmail.com' explicitly due to DB mismatch
    if (!req.user || (!req.user.isAdmin && req.user.email !== 'ofarar@gmail.com')) {
        console.log('!!! ADMIN ACCESS DENIED [all-users] !!! User:', req.user ? `${req.user._id} | ${req.user.email} | Admin:${req.user.isAdmin}` : 'Unauthenticated');
        return res.status(403).json({ message: 'Forbidden: Admins only.' });
    }

    try {
        const { sortBy = 'username', order = 'asc', isGoldenMember, isVerified } = req.query;

        const validSortKeys = [
            'avgRating', 'goldenSubscribersCount', 'followingCount',
            'goldenSubscriptionsCount', 'predictionCount', 'username', 'createdAt'
        ];

        let sortKey = validSortKeys.includes(sortBy) ? sortBy : 'username';

        if (sortKey === 'avgScore') {
            sortKey = 'avgRating';
        }

        const sortOrder = order === 'asc' ? 1 : -1;
        const sortQuery = { [sortKey]: sortOrder, username: 1 };

        const matchQuery = {};
        if (isGoldenMember === 'true') {
            matchQuery.isGoldenMember = true;
        }
        if (isVerified === 'true') { matchQuery.isVerified = true; }
        if (req.query.isBot === 'true') { matchQuery.isBot = true; }

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
                $project: {
                    username: 1,
                    avatar: 1,
                    isGoldenMember: 1,
                    isVerified: 1,
                    verifiedAt: 1,
                    followersCount: 1,
                    followingCount: 1,
                    goldenSubscribersCount: 1,
                    goldenSubscriptionsCount: 1,
                    predictionCount: { $size: { $ifNull: ["$predictions", []] } },
                    avgRating: { $round: [{ $ifNull: ["$avgRating", 0] }, 1] }
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

// POST: Health check for services
router.post('/admin/health-check/:service', async (req, res) => {
    // 1. Security check remains the same.
    if (!req.user || (!req.user.isAdmin && req.user.email !== 'ofarar@gmail.com')) {
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
            return res.json({ service, status: 'failed', latency: `${latency}ms`, details: error.message });
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
        case 'api-calls':
            return checkService(() => new Promise((resolve, reject) => {
                const stats = financeAPI.getApiCallStats();
                // Format the stats into a string for the 'details' field
                const details = `Quotes: ${stats.getQuote}, History: ${stats.getHistorical}, Search: ${stats.search}`;
                resolve(details);
            }), 'OK');
        case 'finance-current':
            return checkService(async () => {
                const quote = await financeAPI.getQuote('AAPL');

                if (quote && quote.price) {
                    return `OK (AAPL Price: ${quote.price.toFixed(2)} ${quote.currency})`;
                }
                throw new Error("Quote fetched but price/currency data is missing.");
            });
        case 'finance-historical':
            return checkService(async () => {
                const historicalData = await financeAPI.getHistorical('AAPL', {
                    period1: '2025-10-01',
                    period2: '2025-11-18'
                });

                if (historicalData && historicalData.length > 0) {
                    // Create a safe, readable string summary
                    const firstDate = new Date(historicalData[0].date).toLocaleDateString('en-US');
                    const lastDate = new Date(historicalData[historicalData.length - 1].date).toLocaleDateString('en-US');
                    return `OK (Fetched ${historicalData.length} data points, from ${firstDate} to ${lastDate})`;
                }
                throw new Error("Historical data returned an empty array.");
            });
        case 'avatar':
            return checkService(async () => {
                await axios.get('https://api.dicebear.com/8.x/lorelei/svg?seed=test');
                return 'OK (DiceBear API is responsive)';
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
                await axios.get(`http://localhost:${port}/api/users/${anyUser._id}`);
                return 'OK'; // We only care if it resolves without error
            });

        case 'config-env':
            return checkService(() => new Promise((resolve, reject) => {
                const requiredVars = ['MONGO_URI', 'COOKIE_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GMAIL_USER'];
                const missingVars = requiredVars.filter(v => !process.env[v]);
                if (missingVars.length > 0) {
                    reject(new Error(`Missing required environment variables: ${missingVars.join(', ')}`));
                } else {
                    resolve('OK (All required variables are present)');
                }
            }));

        case 'nasdaq-api':
            return checkService(async () => {
                const today = new Date().toISOString().split('T')[0];
                const url = `https://api.nasdaq.com/api/calendar/earnings?date=${today}`;
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'application/json, text/plain, */*',
                        'Referer': 'https://www.nasdaq.com/'
                    },
                    timeout: 5000
                });

                if (response.data && response.data.status && response.data.status.rCode === 200) {
                    return 'OK (NASDAQ API is reachable)';
                }
                throw new Error('NASDAQ API returned invalid status.');
            });

        case 'crypto-api':
            return checkService(async () => {
                const quote = await cryptoProvider.getQuote('BTC-USD');
                if (quote && quote.price) {
                    return `OK (BTC Price: ${quote.price} USD)`;
                }
                throw new Error('Crypto API returned no price data.');
            });

        // --- NEW AI CHECKS ---
        case 'python-runtime':
            return checkService(async () => {
                const { exec } = require('child_process');
                return new Promise((resolve, reject) => {
                    // Try 'python3' first, then 'python'
                    const cmd = process.platform === 'win32' ? 'python --version' : 'python3 --version';
                    exec(cmd, (error, stdout, stderr) => {
                        if (error) {
                            reject(new Error(`Python not found. Error: ${error.message}`));
                        } else {
                            resolve(`OK (${stdout.trim() || stderr.trim()})`);
                        }
                    });
                });
            });

        case 'bot-user':
            return checkService(async () => {
                const botUser = await User.findOne({ isBot: true });
                if (!botUser) throw new Error('No user with isBot=true found.');
                return `OK (Found bot: ${botUser.username})`;
            });

        case 'model-file':
            return checkService(async () => {
                const fs = require('fs');
                const path = require('path');
                // Check if the file exists in the expected location (server/ml_service/...)
                const modelPath = path.join(__dirname, '../ml_service/earnings_model.py');
                if (fs.existsSync(modelPath)) {
                    return 'OK (Model file present on disk)';
                }
                throw new Error(`Model file missing at: ${modelPath}`);
            });

        default:
            return res.status(404).json({ message: 'Unknown service check.' });
    }
});

module.exports = router;
