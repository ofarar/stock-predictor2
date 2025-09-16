const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// 1. Import the function from your new service file
const { sendWelcomeEmail } = require('../services/email');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id).then(user => {
        done(null, user);
    });
});

passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {

        // --- START DEBUGGING LOGS ---
        console.log("--- Google Profile Data Received ---");
        console.log("ID:", profile.id);
        console.log("Display Name:", profile.displayName);
        console.log("Email:", profile.emails[0].value);
        console.log("------------------------------------");
        // --- END DEBUGGING LOGS ---

        try {
            const userEmail = profile.emails[0].value;
            const existingUser = await User.findOne({ googleId: profile.id });

            if (existingUser) {
                console.log("User already exists:", existingUser);
                done(null, existingUser);
            } else {
                console.log("User not found. Creating a new user...");
                const newUser = await new User({
                    googleId: profile.id,
                    username: profile.displayName,
                    email: userEmail
                }).save();

                // 2. Call the imported function for the new user
                sendWelcomeEmail(newUser.email, newUser.username);

                console.log("New user created successfully:", newUser);
                done(null, newUser);
            }
        } catch (error) {
            console.error("!!! Error saving user to database !!!", error);
            done(error, null);
        }
    })
);