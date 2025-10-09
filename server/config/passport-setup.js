const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

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
        try {
            const userEmail = profile.emails[0].value;
            const existingUser = await User.findOne({ googleId: profile.id });

            if (existingUser) {
                done(null, existingUser);
            } else {
                console.log("User not found. Creating a new user...");
                const newUsername = profile.displayName;
                
                // FIX: Generate a default avatar URL using the username as a seed
                const defaultAvatar = `https://api.dicebear.com/8.x/lorelei/svg?seed=${encodeURIComponent(newUsername)}`;

                const newUser = await new User({
                    googleId: profile.id,
                    username: newUsername,
                    email: userEmail,
                    avatar: defaultAvatar // <-- Assign the default avatar here
                }).save();

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