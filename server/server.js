require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');
require('./config/passport-setup'); // Run the passport config
const cron = require('node-cron');
const runAssessmentJob = require('./jobs/assessment-job'); // Import the job

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',              // for local dev
        'https://predictostock.vercel.app'    // for production frontend
    ],
    credentials: true // Allow cookies to be sent
}));
app.use(express.json());

app.use(cookieParser());

// Heroku/Render use proxies. This is needed for session cookies in production.
app.set('trust proxy', 1);

// Use session middleware ONCE
app.use(
    session({
        secret: process.env.COOKIE_KEY,
        resave: false,
        saveUninitialized: false,
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
    console.log('Session ID:', req.sessionID);
    console.log('Session object:', req.session);
    console.log('Cookies:', req.cookies); // will show signed cookie if exists
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