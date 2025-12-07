const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');

// GET: Fetch settings
router.get('/settings', async (req, res) => {
    try {
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

        if (!settings) {
            console.log("No settings document found. Creating one with default badge settings.");
            settings = await new Setting({ badgeSettings: defaultBadgeSettings }).save();
        } else if (!settings.badgeSettings || Object.keys(settings.badgeSettings).length === 0) {
            console.log("Found settings document but it's missing badge rules. Applying defaults.");
            settings.badgeSettings = defaultBadgeSettings;
            settings = await settings.save();
        }

        // --- FIX 1: Explicitly disable caching for this critical fetch ---
        // This ensures the browser always requests the latest version from the server.
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        res.json(settings);
    } catch (err) {
        console.error("Error in GET /settings:", err);
        res.status(500).json({ message: 'Error fetching settings' });
    }
});

// PUT: Update admin settings
router.put('/settings/admin', async (req, res) => {
    if (!req.user || (!req.user.isAdmin && req.user.email !== 'ofarar@gmail.com')) {
        return res.status(403).send('Forbidden: Admins only.');
    }
    try {
        const updateData = {};

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
        if (req.body.isAIWizardEnabled !== undefined) {
            updateData.isAIWizardEnabled = req.body.isAIWizardEnabled;
        }
        if (req.body.maxPredictionsPerDay !== undefined) {
            updateData.maxPredictionsPerDay = parseInt(req.body.maxPredictionsPerDay) || 10;
        }
        if (req.body.isFinanceApiEnabled !== undefined) {
            updateData.isFinanceApiEnabled = req.body.isFinanceApiEnabled;
        }
        if (req.body.isEarningsBannerActive !== undefined) {
            updateData.isEarningsBannerActive = req.body.isEarningsBannerActive;
        }
        // --- NEW FIELDS ---
        if (req.body.isXIconEnabled !== undefined) {
            updateData.isXIconEnabled = req.body.isXIconEnabled;
        }
        if (req.body.xAccountUrl !== undefined) {
            updateData.xAccountUrl = req.body.xAccountUrl;
        }

        const updatedSettings = await Setting.findOneAndUpdate({},
            { $set: updateData },
            { new: true, upsert: true }
        );
        // --- FIX 2: Clear cache headers on the response to ensure immediate client update ---
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.json(updatedSettings);
    } catch (err) {
        console.error("Error updating settings:", err);
        res.status(400).json({ message: 'Error updating settings' });
    }
});

module.exports = router;
