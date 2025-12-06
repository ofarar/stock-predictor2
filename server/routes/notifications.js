const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');

// GET: Fetch notifications
router.get('/notifications', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 })
            .populate('sender', 'username avatar');
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

// POST: Mark notifications as read
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

// PUT: Update notification settings
router.put('/notification-settings', async (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { notificationSettings: req.body } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json(updatedUser.notificationSettings);
    } catch (err) {
        console.error("Error updating notification settings:", err);
        res.status(500).json({ message: 'Error updating settings.' });
    }
});

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

// POST: Register FCM Token
module.exports = router;
