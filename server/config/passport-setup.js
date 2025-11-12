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
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true // <-- 1. ENABLE THIS
    }, async (req, accessToken, refreshToken, profile, done) => {
        try {
            const userEmail = profile.emails[0].value;
            const existingUser = await User.findOne({ googleId: profile.id });

            if (existingUser) {
                // User already exists, proceed as normal.
                return done(null, existingUser, { isNewUser: false });
            } else {
                // This is a new user. Check if their proposed username is available.
                const newUsername = profile.displayName;
                const existingUsername = await User.findOne({ username: newUsername });

                if (existingUsername) {
                    // Username is taken. Signal to the frontend to ask for a new one.
                    // We pass 'false' for the user because they haven't been created yet.
                    // The profile info is passed in the 'info' object to be used by the frontend.
                    return done(null, false, {
                        action: 'CHOOSE_USERNAME',
                        profile: {
                            googleId: profile.id,
                            email: userEmail,
                            suggestedUsername: newUsername,
                            avatar: `https://api.dicebear.com/8.x/lorelei/svg?seed=${encodeURIComponent(newUsername)}`
                        }
                    });
                } else {
                    // Username is available. Create the new user.
                    const defaultAvatar = `https://api.dicebear.com/8.x/lorelei/svg?seed=${encodeURIComponent(newUsername)}`;
                    const newUserFields = {
                        googleId: profile.id,
                        username: newUsername,
                        email: userEmail,
                        avatar: defaultAvatar
                    }

                    // --- 3. NEW: CHECK FOR REFERRAL ---
                    const referralCode = req.session.referralCode;
                    if (referralCode) {
                        try {
                            const inviter = await User.findById(referralCode);
                            if (inviter) {
                                // Add points to the inviter
                                const pointsToAward = 500; // 500 points for a successful referral
                                if (!inviter.analystRating) { // Initialize if old user
                                    inviter.analystRating = { total: 0, fromPredictions: 0, fromBadges: 0, fromShares: 0, fromReferrals: 0, fromRanks: 0 };
                                }
                                inviter.analystRating.total += pointsToAward;
                                inviter.analystRating.fromReferrals += pointsToAward;
                                inviter.referrals.push(newUser._id); // Track who they invited
                                await inviter.save();

                                // Add reference to the new user
                                newUserFields.invitedBy = inviter._id;
                            }
                        } catch (err) {
                            console.error("Referral award error:", err);
                        }
                        // Clear the code from the session
                        delete req.session.referralCode;
                    }
                    // --- END NEW ---

                    const newUser = await new User(newUserFields).save();

                    console.log("New user created successfully:", newUser);
                    return done(null, newUser, { isNewUser: true });
                }
            }
        } catch (error) {
            console.error("!!! Error in Google Auth Strategy !!!", error);
            done(error, null);
        }
    })
);