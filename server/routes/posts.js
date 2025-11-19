const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const financeAPI = require('../services/financeAPI');
const xss = require('xss');

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
            message: xss(message), // Using xss for sanitization
            isGoldenPost: true,
        };

        // --- Resilient Prediction Attachment Logic (Remains Unchanged) ---
        if (attachedPrediction && attachedPrediction.stockTicker) {
            let priceAtCreation = null;
            let currency = 'USD'; // Default currency

            try {
                const quote = await financeAPI.getQuote(attachedPrediction.stockTicker);
                priceAtCreation = quote.regularMarketPrice;
                currency = quote.currency;
            } catch (financeApiError) {
                console.warn(`Golden Post: Could not fetch price for ${attachedPrediction.stockTicker} at creation. Error: ${financeApiError.message}`);
            }

            newPostData.attachedPrediction = {
                ...attachedPrediction,
                priceAtCreation: priceAtCreation,
                currency: currency,
            };
        }
        // --- End of Resilient Logic ---

        const newPost = new Post(newPostData);
        await newPost.save();

        // --- FIX 1 & 2: Use efficient population and add message content ---
        // Fetch the creator and populate their list of active subscribers
        const creator = await User.findById(req.user._id).populate('goldenSubscribers.user');
        const validSubscribers = creator.goldenSubscribers.filter(sub => sub.user);

        if (validSubscribers.length > 0) {
            const notifications = validSubscribers.map(sub => ({
                recipient: sub.user._id,
                sender: creator._id,
                type: 'GoldenPost',
                messageKey: 'notifications.goldenPost',
                link: '/golden-feed',
                metadata: {
                    username: creator.username,
                    // FIX 2: Add post message snippet (clipped to 50 chars)
                    postMessage: newPost.message.substring(0, 50) + (newPost.message.length > 50 ? '...' : '')
                }
            }));

            await Notification.insertMany(notifications);
        }

        res.status(201).json(newPost);
    } catch (err) {
        console.error("Error creating golden post:", err);
        res.status(500).json({ message: 'Error creating post.' });
    }
});

// GET: Golden Feed (Aggregated)
router.get('/golden-feed', async (req, res) => {
    if (!req.user) return res.status(401).send('Not logged in');

    try {
        const { page = 1, limit = 10, authorId, stock, predictionType } = req.query;
        const currentPage = parseInt(page);
        const limitPerPage = parseInt(limit);
        const skip = (currentPage - 1) * limitPerPage;

        const user = await User.findById(req.user._id);
        // Get subscriptions (users the current user follows/subscribes to)
        const subscriptions = user.goldenSubscriptions.filter(sub => sub.user).map(sub => sub.user);
        // Include own posts
        subscriptions.push(req.user._id);

        // Build Query
        const query = { isGoldenPost: true };

        // Filter by Author
        if (authorId && authorId !== 'All') {
            query.userId = authorId;
        } else {
            // Default: Show posts from subscriptions + self
            query.userId = { $in: subscriptions };
        }

        // Filter by Stock Ticker (in attached prediction)
        if (stock) {
            query['attachedPrediction.stockTicker'] = stock.toUpperCase();
        }

        // Filter by Prediction Type
        if (predictionType && predictionType !== 'All') {
            query['attachedPrediction.predictionType'] = predictionType;
        }

        // Execute Query with Pagination
        const totalPosts = await Post.countDocuments(query);
        const totalPages = Math.ceil(totalPosts / limitPerPage);

        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitPerPage)
            .populate('userId', 'username avatar isGoldenMember isVerified')
            .lean();

        res.json({
            posts,
            totalPages,
            currentPage
        });

    } catch (err) {
        console.error("Error fetching golden feed:", err);
        res.status(500).json({ message: 'Error fetching feed.' });
    }
});

// POST: Mark feed as read (Optional, if you track read status per post or generally)
router.post('/golden-feed/mark-as-read', async (req, res) => {
    // Implementation depends on how you want to track "read" status.
    // For now, just return success as a placeholder or implement logic if needed.
    res.status(200).send();
});

router.get('/posts/golden/:userId', async (req, res) => {
    try {
        const profileUserId = req.params.userId;
        let isAllowed = false;
        let posts = [];

        if (req.user) {
            // FIX 1: Fetch the FULL current user object once at the start of the block
            const currentSessionUser = await User.findById(req.user._id);

            if (!currentSessionUser) {
                // Should not happen if session is valid, but good check
                return res.status(401).json({ message: 'Session user not found.' });
            }

            const currentUserId = currentSessionUser._id.toString();
            const profileUser = await User.findById(profileUserId);

            if (!profileUser) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const isOwner = currentUserId === profileUserId;

            // --- Subscriber Check ---
            const isSubscriber = profileUser.goldenSubscribers.some(
                sub => sub && sub.user && sub.user.toString() === currentUserId
            );
            // ------------------------

            if (isOwner || isSubscriber) {
                isAllowed = true;

                // --- Post Fetching Logic ---
                const profileObjectId = new mongoose.Types.ObjectId(profileUserId);

                // FIX 2: Use the already fetched currentSessionUser for the timestamp
                const lastCheck = currentSessionUser.lastCheckedGoldenFeed || new Date(0);

                // Fetch posts (using lean/limit for performance)
                const rawPosts = await Post.find({ userId: profileObjectId, isGoldenPost: true })
                    .sort({ createdAt: -1 })
                    .limit(50) // Limit posts for the feed
                    .lean();

                // Add the 'isNew' flag for the frontend UI
                rawPosts.forEach(post => { post.isNew = new Date(post.createdAt) > new Date(lastCheck); });
                posts = rawPosts;
            }
        }

        // Return the access control flag and the posts (which will be empty if access is denied)
        res.json({ isAllowed, posts });

    } catch (err) {
        console.error("Error fetching profile golden feed:", err);
        res.status(500).json({ message: 'Server error while fetching feed.' });
    }
});

module.exports = router;
