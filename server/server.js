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
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;

// Use Helmet to set various security headers
app.use(helmet());

// --- CORS Configuration ---
// This tells your server to accept requests from your Vercel app.
const allowedOrigins = ['http://localhost:3000', 'https://predictostock.vercel.app'];

const corsOptions = {
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true, // This is important for cookies/sessions
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

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));