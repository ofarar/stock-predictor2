require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // <-- Import MongoStore
const passport = require('passport');
const helmet = require('helmet');
require('./config/passport-setup'); // Run the passport config
const cron = require('node-cron');
const runAssessmentJob = require('./jobs/assessment-job'); // Import the job

const app = express();
const PORT = process.env.PORT || 5001;

// Use Helmet to set various security headers
app.use(helmet());

// Middleware
const whitelist = [
    'http://localhost:3000',
    'https://predictostock.vercel.app'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Check if the origin is in the whitelist or if it's a Vercel preview URL
        if (whitelist.indexOf(origin) !== -1 || new URL(origin).hostname.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true // Allow cookies to be sent
};

app.use(cors(corsOptions));
app.use(express.json());

// Heroku/Render use proxies. This is needed for session cookies in production.
app.set('trust proxy', 1);

// Use session middleware ONCE
app.use(
    session({
        secret: process.env.COOKIE_KEY,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }), // <-- Use MongoStore
        cookie: {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            secure: process.env.NODE_ENV === "production", // Cookie only works in HTTPS
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());

// Log session info for debugging
app.use((req, res, next) => {
    console.log(`--- NEW REQUEST: ${req.method} ${req.originalUrl} ---`);
    console.log('Session ID:', req.sessionID);
    console.log('Session object:', req.session);
    next();
});

// DB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected...'))
    .catch(err => console.log(err));

// Routes
app.use('/api', require('./routes/api'));
app.use('/auth', require('./routes/auth')); // Use the auth routes

// --- Schedule the Assessment Job ---
// This cron schedule runs the job every 5 minutes.
// You can change it to '0 * * * *' to run at the top of every hour.
cron.schedule('*/5 * * * *', () => {
    console.log('Running the scheduled assessment job...');
    runAssessmentJob();
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));