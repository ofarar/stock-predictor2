const mongoose = require('mongoose');
const { SitemapStream, streamToPromise } = require('sitemap');
const path = require('path');
const fs = require('fs'); // Standard Node.js file system module

// --- 1. Load .env variables explicitly ---
require('dotenv').config();

// --- Import Models (Used to query data) ---
const User = require('./models/User');
const Prediction = require('./models/Prediction');

// --- Configuration ---
// NOTE: Change this hostname to your production domain!
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
            smStream.write({ url: route, changefreq: 'daily', priority: 0.7 });
        });

        // 2. Add Dynamic Stock Routes
        const allTickers = await Prediction.distinct('stockTicker');
        allTickers.forEach(ticker => {
            smStream.write({
                url: `/stock/${ticker}`,
                changefreq: 'daily',
                priority: 0.9
            });
        });

        // 3. Add Dynamic Profile Routes
        const activeUserIds = await User.find({ predictionCount: { $gt: 0 } }).select('_id');
        activeUserIds.forEach(user => {
            smStream.write({
                url: `/profile/${user._id}`,
                changefreq: 'weekly',
                priority: 0.8
            });
        });

        // 4. End the stream to signal no more data
        // 4. End the stream
        smStream.end();

        // 5. Convert stream to a buffer using streamToPromise
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