
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
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

app.use(
    session({
        secret: process.env.COOKIE_KEY,
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
    })
);
app.use(passport.initialize());
app.use(passport.session());

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