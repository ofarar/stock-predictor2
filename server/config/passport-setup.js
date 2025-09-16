const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

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
        callbackURL: '/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        // Check if user already exists
        const existingUser = await User.findOne({ googleId: profile.id });

        if (existingUser) {
            // Already have this user
            done(null, existingUser);
        } else {
            // If not, create a new user AND their starting portfolio
            const newUser = await new User({
                googleId: profile.id,
                username: profile.displayName,
                // You can add more fields like profile picture from profile.photos[0].value
            }).save();
        
            
            done(null, newUser);
        }
    })
);