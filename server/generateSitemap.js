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

const LANGUAGES = ['en', 'tr', 'de', 'es', 'zh', 'ru', 'fr', 'nl', 'ar', 'hi'];

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

        // Helper to add language variants
        const addUrlWithLanguages = (url, priority, changefreq, lastmod) => {
            LANGUAGES.forEach(lang => {
                // Construct the URL for this language
                // Default language (en) uses the base URL, others use ?lang=xx
                const pageUrl = lang === 'en' ? url : `${url}?lang=${lang}`;

                // Construct hreflang links for this entry
                const links = LANGUAGES.map(l => ({
                    lang: l,
                    url: l === 'en' ? `${hostname}${url}` : `${hostname}${url}?lang=${l}`
                }));
                // Add x-default pointing to English
                links.push({ lang: 'x-default', url: `${hostname}${url}` });

                smStream.write({
                    url: pageUrl,
                    changefreq,
                    priority,
                    lastmod,
                    links
                });
            });
        };

        // 1. Add Static Routes
        const today = new Date().toISOString();
        STATIC_ROUTES.forEach(route => {
            let priority = 0.7;
            if (route === '/') priority = 1.0;
            if (route === '/explore') priority = 0.9;
            if (route === '/scoreboard') priority = 0.8;

            addUrlWithLanguages(route, priority, 'daily', today);
        });

        // 2. Add Dynamic Stock Routes (Including lastmod)
        const stockUpdates = await Prediction.aggregate([
            {
                $group: {
                    _id: '$stockTicker',
                    lastMod: { $max: '$updatedAt' }
                }
            }
        ]);

        stockUpdates.forEach(stock => {
            addUrlWithLanguages(`/stock/${stock._id}`, 0.9, 'daily', stock.lastMod);
        });

        // 3. Add Dynamic Profile Routes (Including lastmod)
        const activeUsers = await User.find({
            'analystRating.total': { $gt: 0 }
        })
            .select('_id updatedAt')
            .lean();

        activeUsers.forEach(user => {
            addUrlWithLanguages(`/profile/${user._id}`, 0.8, 'weekly', user.updatedAt);
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