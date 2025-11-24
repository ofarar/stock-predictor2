// server/generateSitemap.js

const mongoose = require('mongoose');
const { SitemapStream, streamToPromise } = require('sitemap');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// --- Import Models (Used to query data) ---
const User = require('./models/User');
const Prediction = require('./models/Prediction');

// --- Configuration ---
const hostname = 'https://www.stockpredictorai.com';
const STATIC_ROUTES = [
    '/',
    '/explore',
    '/scoreboard',
    '/about',
    '/contact',
    '/terms',
    '/privacy',
    '/ai-wizard'
];

async function generateSitemap() {
    try {
        // --- A. Create Target Directory if missing ---
        const clientPublicPath = path.resolve(__dirname, '..', 'client', 'public');

        if (!fs.existsSync(clientPublicPath)) {
            fs.mkdirSync(clientPublicPath, { recursive: true });
            console.log(`Sitemap Generator: Created missing directory at ${clientPublicPath}`);
        }

        // --- B. Connect to MongoDB ---
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Sitemap Generator: MongoDB connected...');

        // --- C. Generate URLs ---
        const smStream = new SitemapStream({ hostname: hostname });

        // 1. Add Static Routes
        STATIC_ROUTES.forEach(route => {
            // Note: lastmod is not strictly necessary for truly static routes
            smStream.write({ url: route, changefreq: 'daily', priority: 0.7 });
        });

        // 2. Add Dynamic Stock Routes (Including lastmod)
        // Goal: Get distinct tickers and the max(updatedAt) for each one.
        const stockUpdates = await Prediction.aggregate([
            {
                $group: {
                    _id: '$stockTicker',
                    lastMod: { $max: '$updatedAt' } // Use the most recent activity on this ticker
                }
            }
        ]);

        stockUpdates.forEach(stock => {
            smStream.write({
                url: `/stock/${stock._id}`,
                changefreq: 'daily',
                priority: 0.9,
                lastmod: stock.lastMod // Add the last modified timestamp
            });
        });

        // 3. Add Dynamic Profile Routes (Including lastmod)
        // Goal: Get active users and their last modified time (from the document itself).
        const activeUsers = await User.find({
            'analystRating.total': { $gt: 0 }
        })
            // Select the ID and the built-in updatedAt timestamp
            .select('_id updatedAt')
            .lean(); // Use lean() for performance

        activeUsers.forEach(user => {
            smStream.write({
                url: `/profile/${user._id}`,
                changefreq: 'weekly',
                priority: 0.8,
                lastmod: user.updatedAt // Add the user's last modified timestamp
            });
        });

        // 4. End the stream
        smStream.end();

        // 5. Convert stream to a buffer
        const sitemapBuffer = await streamToPromise(smStream);

        // 6. Write the file manually
        const sitemapPath = path.join(clientPublicPath, 'sitemap.xml');
        fs.writeFileSync(sitemapPath, sitemapBuffer);

        console.log(`Sitemap successfully generated at ${sitemapPath}`);


    } catch (e) {
        console.error('Sitemap Generator Error:', e);
    } finally {
        // Disconnect from the database cleanly
        mongoose.connection.close();
        console.log('Sitemap Generator: MongoDB disconnected.');
    }
}

generateSitemap();