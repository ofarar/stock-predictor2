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
/// 2. Body Parsers
// The webhook route in stripe.js has its own raw body parser,
// so express.json() here is fine for all other routes.


// 3. Trust Proxy (for production environments like Render/Heroku)
app.set('trust proxy', 1);

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
        }
    })
);

// 5. Passport Authentication
app.use(passport.initialize());
app.use(passport.session());

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

// --- API Routes ---
// All routes that require authentication must be placed AFTER passport middleware.
app.use('/api', require('./routes/api'));
app.use('/auth', require('./routes/auth'));
app.use('/api/stripe', require('./routes/stripe')); // <-- MOVED HERE

app.use(express.json());

// --- Scheduled Jobs ---
cron.schedule('*/5 * * * *', () => {
    console.log('Running the scheduled assessment job...');
    runAssessmentJob();
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));