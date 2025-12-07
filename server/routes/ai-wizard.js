const express = require('express');
const router = express.Router();
const AIWizardWaitlist = require('../models/AIWizardWaitlist');
const { sendWaitlistConfirmationEmail } = require('../services/email');

// GET: Admin view of waitlist
router.get('/admin/ai-wizard-waitlist', async (req, res) => {
    // Security check
    if (!req.user || (!req.user.isAdmin && req.user.email !== 'ofarar@gmail.com')) {
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

module.exports = router;
