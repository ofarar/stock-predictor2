const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const Notification = require('../models/Notification');

const { sendWelcomeEmail } = require('../services/email');
const { sendPushToUser } = require('../services/pushNotificationService');

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
                    // --- NEW: Add Early User Bonus Points ---
                    const earlyUserBonus = 1000;
                    const analystRatingObject = {
                        total: earlyUserBonus,
                        fromPredictions: 0,
                        fromBadges: 0,
                        fromShares: 0,
                        fromReferrals: 0,
                        fromRanks: 0,
                        fromBonus: earlyUserBonus,
                        shareBreakdown: {},
                        predictionBreakdownByStock: {},
                        badgeBreakdown: {},
                        rankBreakdown: {}
                    };
                    // --- END NEW ---

                    const newUser = await new User({
                        googleId: profile.id,
                        username: newUsername,
                        email: userEmail,
                        avatar: defaultAvatar,
                        analystRating: analystRatingObject
                    }).save();

                    // --- 3. NEW: CHECK FOR REFERRAL ---
                    // Defensive check for session
                    let referralCode = null;
                    if (req.session && req.session.referralCode) {
                        referralCode = req.session.referralCode;
                    }

                    if (referralCode) {
                        try {
                            const inviter = await User.findById(referralCode);
                            if (inviter) {
                                // Add points to the inviter
                                const pointsToAward = 500; // 500 points for a successful referral
                                // On-the-fly migration for inviter's rating object
                                if (typeof inviter.analystRating !== 'object' || inviter.analystRating === null) {
                                    const oldPoints = typeof inviter.analystRating === 'number' ? inviter.analystRating : 0;
                                    inviter.analystRating = { total: oldPoints, fromPredictions: oldPoints, fromBadges: 0, fromShares: 0, fromReferrals: 0, fromRanks: 0, fromBonus: 0, shareBreakdown: {}, predictionBreakdownByStock: {}, badgeBreakdown: {}, rankBreakdown: {} };
                                }
                                inviter.analystRating.total += pointsToAward;
                                inviter.analystRating.fromReferrals += pointsToAward;
                                inviter.referrals.push(newUser._id);
                                await inviter.save();

                                // Add reference to the new user
                                newUser.invitedBy = inviter._id;
                                await newUser.save();

                                // --- 4. CREATE NOTIFICATION FOR INVITER ---
                                // --- 4. CREATE NOTIFICATION FOR INVITER ---
                                try {
                                    if (!inviter.notificationSettings || inviter.notificationSettings.newReferral !== false) {
                                        await new Notification({
                                            recipient: inviter._id,
                                            sender: newUser._id,
                                            type: 'NewReferral',
                                            messageKey: 'notifications.newReferral',
                                            link: `/profile/${newUser._id}`,
                                            metadata: {
                                                username: newUser.username,
                                                points: pointsToAward
                                            }
                                        }).save();

                                        sendPushToUser(
                                            inviter._id,
                                            "New Referral!",
                                            `${newUser.username} joined using your referral code! (+${pointsToAward} pts)`,
                                            { url: `/profile/${newUser._id}` },
                                            'newReferral'
                                        );
                                    }
                                } catch (notifyErr) {
                                    console.error("Referral Notification Error:", notifyErr);
                                }
                                // --- END NOTIFICATION ---
                            }
                        } catch (err) {
                            console.error("Referral award error:", err);
                        }
                        // Clear the code from the session
                        if (req.session) {
                            delete req.session.referralCode;
                        }
                    }
                    // --- END NEW ---

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