const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const financeAPI = require('../services/financeAPI');
const xss = require('xss');

// POST: Create a Golden Post
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

        const newPost = new Post(newPostData);
        await newPost.save();

        // Notify subscribers
        const subscribers = await User.find({ 'goldenSubscriptions.user': req.user._id });
        const notifications = subscribers.map(subscriber => ({
            recipient: subscriber._id,
            sender: req.user._id,
            type: 'GoldenPost',
            messageKey: 'notifications.newGoldenPost',
            link: `/posts/golden/${req.user._id}`, // Link to the creator's feed
            metadata: {
                username: req.user.username
            }
        }));

        if (notifications.length > 0) {
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

// GET: Specific User's Golden Posts
router.get('/posts/golden/:userId', async (req, res) => {
    try {
        const posts = await Post.find({ userId: req.params.userId, isGoldenPost: true })
            .sort({ createdAt: -1 })
            .populate('userId', 'username avatar isGoldenMember isVerified');
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching user posts.' });
    }
});

module.exports = router;
