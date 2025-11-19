const express = require('express');
const router = express.Router();
const User = require('../models/User');
const rateLimit = require('express-rate-limit');

const actionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Max 200 "actions" (like/follow) per 15 min per IP
    message: 'Too many actions, please try again later.',
});

// POST: Share activity (e.g., sharing a prediction)
router.post('/activity/share', actionLimiter, async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');

    try {
        const { type, platform } = req.body;
        // type: 'prediction', 'profile', etc.
        // platform: 'twitter', 'facebook', etc.

        // Increment share count for the user
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { 'analystRating.fromShares': 5 }
        });

        res.status(200).json({ message: 'Share recorded.' });
    } catch (err) {
        console.error("Error recording share:", err);
        res.status(500).json({ message: 'Error recording share.' });
    }
});

module.exports = router;
