const express = require('express');
const router = express.Router();
const User = require('../models/User');
const rateLimit = require('express-rate-limit');

const actionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Max 200 "actions" (like/follow) per 15 min per IP
    message: 'Too many actions, please try again later.',
});

// server/routes/users.js (Add this new route)

// POST: Share activity (e.g., sharing a prediction)
// POST: Share activity (e.g., sharing a prediction)
router.post('/activity/share', actionLimiter, async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');

    const POINTS_PER_SHARE = 5;
    const { shareContext } = req.body;

    // Determine the category based on shareContext
    let shareCategory = 'Other';
    if (shareContext?.context === 'prediction') {
        shareCategory = 'Prediction';
    } else if (shareContext?.context === 'badge') {
        shareCategory = 'Badge';
    } else if (shareContext?.context === 'rank') {
        shareCategory = 'Rank';
    } else if (shareContext?.context === 'summary') {
        shareCategory = 'Summary'; // New Category
    }

    try {
        // The category key is used directly as the map key (e.g., 'Prediction', 'Badge')
        const categoryKey = shareCategory;

        // Dynamically create the path for the nested map key using dot notation
        // Example path: "analystRating.shareBreakdown.Prediction"
        const mapKeyPath = `analystRating.shareBreakdown.${categoryKey}`;

        // --- FIX: Use $inc for atomic update (resolves CastError) ---
        const updateOperation = {
            $inc: {
                "analystRating.total": POINTS_PER_SHARE,
                "analystRating.fromShares": POINTS_PER_SHARE
            }
        };

        // Add the dynamic $inc for the specific map key to the update object
        updateOperation.$inc[mapKeyPath] = POINTS_PER_SHARE;

        await User.findByIdAndUpdate(req.user._id, updateOperation, { new: true });

        res.status(200).json({ message: 'Share recorded.' });

    } catch (err) {
        console.error("Error recording share:", err);
        // Log the full error to Sentry/console but send a generic 500 error to the client
        res.status(500).json({ message: 'Error recording share.' });
    }
});

module.exports = router;
