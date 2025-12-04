require("./instrument.js");
require('dotenv').config();

const express = require('express');
const Sentry = require("@sentry/node");
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // <-- Import MongoStore
const passport = require('passport');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit'); // <-- Added import
require('./config/passport-setup'); // Run the passport config
const cron = require('node-cron');
const runAssessmentJob = require('./jobs/assessment-job'); // Import the job
const { runHourlyRankJob, runDailyRankJob, runWeeklyRankJob, runMonthlyRankJob } = require('./jobs/long-term-rank-job');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

// Use Helmet to set various security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            // CRITICAL FIX: Add the missing Stripe domain here
            connectSrc: [
                "'self'",
                "https://connect-js.stripe.com",
                "https://connect.stripe.com",
                "https://*.stripe.com",
                "https://*.stripe.global",
                "https://api.stripe.com",
                "https://b.stripecdn.com",
                "https://c.stripe.com",
                "ws://localhost:5001",
                "wss://stockpredictorai-api.fly.dev"
            ],
            // Allow Stripe scripts
            scriptSrc: [
                "'self'",
                "'unsafe-inline'", // Needed for React/Vite/Sentry
                "https://js.stripe.com",
                "https://connect.stripe.com"
            ],
            // Allow Stripe iframes (e.g., Connect onboarding popup)
            frameSrc: [
                "'self'",
                "https://js.stripe.com",
                "https://connect.stripe.com",
                "https://*.stripe.com"
            ],
            // Allow avatars and images from external hosts
            imgSrc: ["'self'", "data:", "https://*"],
            // Default sources, usually fine with 'self'
            defaultSrc: ["'self'"],
        },
    },
}));

// --- CORS Configuration ---
// This tells your server to accept requests from your Vercel app.
const allowedOrigins = [
    'http://localhost:5173', // for local development
    'https://stock-predictor2.pages.dev', // Cloudflare Pages default domain
    'https://www.stockpredictorai.com',  // your custom domain
];

const corsOptions = {
    origin: function (origin, callback) {
        // --- FIX: Allow local connections (localhost:xxxx) and no-origin requests ---
        if (!origin || origin.includes('localhost')) {
            return callback(null, true);
        }
        // ------------------------------------------------------------------------

        // Check against the explicit production list
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
};

const io = new Server(server, {
    cors: corsOptions
});

// Make io accessible to our router
app.set('io', io);

app.use(cors(corsOptions));
/// 2. Body Parsers
// The webhook route in stripe.js has its own raw body parser,
// so express.json() here is fine for all other routes.


// 3. Trust Proxy (for production environments like Render/Heroku)
app.set('trust proxy', 1);

// --- RATE LIMITING (High Traffic Protection) ---
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 300, // Limit each IP to 300 requests per `window`
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again later.",
    skip: (req, res) => process.env.NODE_ENV === 'development' // Skip in dev
});
app.use(limiter);

// 4. Session Management
app.use(
    session({
        secret: process.env.COOKIE_KEY,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
        cookie: {
            maxAge: 30 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            httpOnly: true // <-- ADD THIS LINE
        }
    })
);

// 5. Passport Authentication
app.use(passport.initialize());
app.use(passport.session());

// --- CORRECT MIDDLEWARE ORDER ---

// 1. Mount Stripe routes FIRST (webhook needs raw body BEFORE json parser runs)
app.use('/api/stripe', require('./routes/stripe').router);

// 2. Apply global JSON body parser AFTER Stripe webhook is defined
//    This will parse JSON for routes defined *after* this point.
app.use(express.json());

// 3. Mount other API routes AFTER the JSON parser
//    These routes (like /api/quotes) will now receive req.body correctly.
app.use('/api', require('./routes/api'));
app.use('/auth', require('./routes/auth'));

// // --- SENTRY VERIFICATION SNIPPET (FROM DOCS) ---
// // This will trigger an error shortly after server start to verify Sentry is working.
// // setTimeout(() => {
// //     try {
// //         foo(); // This function is undefined and will throw an error
// //     } catch (e) {
// //         console.log("Triggering Sentry Test Error...");
// //         Sentry.captureException(e);
// //     }
// // }, 5000); // Wait 5 seconds after start

// --- END CORRECT MIDDLEWARE ORDER ---

// 6. Request Logging (for debugging)
app.use((req, res, next) => {
    console.log(`--- NEW REQUEST: ${req.method} ${req.originalUrl} ---`);
    console.log('Session ID:', req.sessionID);
    console.log('Session object:', req.session);
    next();
});

// --- DB Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log(err));

// --- Scheduled Jobs ---
cron.schedule('*/5 * * * *', () => {
    console.log('Running the scheduled assessment job...');
    runAssessmentJob();
});

// --- NEW RANKING JOBS ---

// Run the "Hourly" rank job at the start of every hour (e.g., 1:00, 2:00)
cron.schedule('0 * * * *', () => {
    console.log('Running the scheduled Hourly Rank Job...');
    runHourlyRankJob();
});

// Run the "Daily" and "Overall" rank jobs once per day (e.g., at midnight UTC)
cron.schedule('0 0 * * *', () => {
    console.log('Running the scheduled Daily & Overall Rank Job...');
    runDailyRankJob();
});

// Run the "weekly" rank check at 1 AM on Sunday
cron.schedule('0 1 * * 0', () => { // 1:00 AM on Sunday
    console.log('Running the scheduled Weekly Rank Job...');
    runWeeklyRankJob();
});

// Run the "long-term" rank checks at 2 AM on the 1st of every month
cron.schedule('0 2 1 * *', () => { // 2:00 AM on the 1st
    console.log('Running the scheduled Monthly Rank Job...');
    runMonthlyRankJob();
});

// WebSocket Connection Handler
io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    socket.on('joinRoom', (ticker) => {
        socket.join(ticker);
        console.log(`Socket ${socket.id} joined room for ${ticker}`);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
    });
});

server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
// Force restart for env update