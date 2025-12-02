const router = require('express').Router();
const passport = require('passport');
const crypto = require('crypto'); // Built-in Node.js crypto
const User = require('../models/User'); // Ensure User model is imported for exchange
const { sendWelcomeEmail } = require('../services/email');
const { OAuth2Client } = require('google-auth-library');
const Notification = require('../models/Notification');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// In-memory store for mobile one-time tokens (Production should use Redis)
// Map<token, { userId: string, expires: number }>
const mobileAuthTokens = new Map();

// Cleanup expired tokens every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of mobileAuthTokens.entries()) {
    if (data.expires < now) {
      mobileAuthTokens.delete(token);
    }
  }
}, 10 * 60 * 1000);

// Auth with Google
router.get('/google', (req, res, next) => {
  const redirectPath = req.query.redirect || '/';
  const referralCode = req.query.ref;
  const isMobile = req.query.mobile === 'true'; // Check for mobile flag

  // --- NEW: Save the referral code in the session ---
  if (referralCode) {
    req.session.referralCode = referralCode;
  }
  // --- END NEW ---

  // Construct state object
  const state = JSON.stringify({
    path: redirectPath,
    mobile: isMobile
  });

  const authenticator = passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: state // Pass JSON state
  });
  authenticator(req, res, next);
});

router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { failureRedirect: '/' }, (err, user, info) => {
      if (err) { return next(err); }

      // Parse state
      let state = {};
      try {
        state = JSON.parse(req.query.state || '{}');
      } catch (e) {
        // Fallback for old simple string state
        state = { path: req.query.state || '/' };
      }

      const baseURL =
        process.env.NODE_ENV === 'production'
          ? 'https://www.stockpredictorai.com'
          : 'http://localhost:5173';

      // Handle case where username is taken
      if (info && info.action === 'CHOOSE_USERNAME') {
        req.session.pendingProfile = info.profile; // Store profile in session
        return res.redirect(`${baseURL}/complete-profile`);
      }

      if (!user) {
        return res.redirect(baseURL);
      }

      // Manually log the user in
      req.logIn(user, (err) => {
        if (err) { return next(err); }

        // Send welcome email for brand new users
        if (info && info.isNewUser) {
          sendWelcomeEmail(user.email, user.username);
        }

        // --- MOBILE FLOW ---
        if (state.mobile) {
          // Generate a secure random token
          const token = crypto.randomBytes(32).toString('hex');

          // Store token with 5-minute expiration
          mobileAuthTokens.set(token, {
            userId: user._id.toString(),
            expires: Date.now() + 5 * 60 * 1000
          });

          // Redirect to custom scheme
          // stockpredictorai://auth-success?token=...
          return res.redirect(`stockpredictorai://auth-success?token=${token}`);
        }
        // -------------------

        const redirectPath = state.path || '/';
        res.redirect(`${baseURL}${redirectPath}`);
      });
    })(req, res, next);
  }
);

// POST: Native Google Sign-In (Android/iOS)
router.post('/google/native', async (req, res) => {
  const { idToken, refCode } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if username is taken (simple check, might need more robust logic if name collision is high)
      let newUsername = name;
      const existingUsername = await User.findOne({ username: newUsername });
      if (existingUsername) {
        // Simple collision resolution for native flow: append random string
        newUsername = `${name}_${crypto.randomBytes(2).toString('hex')}`;
      }

      const defaultAvatar = picture || `https://api.dicebear.com/8.x/lorelei/svg?seed=${encodeURIComponent(newUsername)}`;

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

      user = await new User({
        googleId,
        username: newUsername,
        email,
        avatar: defaultAvatar,
        analystRating: analystRatingObject
      }).save();

      // --- REFERRAL LOGIC ---
      if (refCode) {
        try {
          const inviter = await User.findById(refCode);
          if (inviter) {
            const pointsToAward = 500;
            if (typeof inviter.analystRating !== 'object' || inviter.analystRating === null) {
              const oldPoints = typeof inviter.analystRating === 'number' ? inviter.analystRating : 0;
              inviter.analystRating = { total: oldPoints, fromPredictions: oldPoints, fromBadges: 0, fromShares: 0, fromReferrals: 0, fromRanks: 0, fromBonus: 0, shareBreakdown: {}, predictionBreakdownByStock: {}, badgeBreakdown: {}, rankBreakdown: {} };
            }
            inviter.analystRating.total += pointsToAward;
            inviter.analystRating.fromReferrals += pointsToAward;
            inviter.referrals.push(user._id);
            await inviter.save();

            user.invitedBy = inviter._id;
            await user.save();

            await new Notification({
              recipient: inviter._id,
              sender: user._id,
              type: 'NewReferral',
              messageKey: 'notifications.newReferral',
              link: `/profile/${user._id}`,
              metadata: {
                username: user.username,
                points: pointsToAward
              }
            }).save();
          }
        } catch (err) {
          console.error("Referral award error (native):", err);
        }
      }

      sendWelcomeEmail(user.email, user.username);
    }

    // Log the user in
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Login failed' });
      }
      return res.json({ success: true, user });
    });

  } catch (error) {
    console.error('Native Google Auth Error:', error);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Dev login route
router.post('/dev_login', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(404).json({ error: 'User not found' });
    }
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      console.log('Dev login success:', user.username);
      return res.json(user);
    });
  } catch (err) {
    console.log('Dev login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET: Logout
router.get('/logout', (req, res, next) => {
  const baseURL =
    process.env.NODE_ENV === 'production'
      ? 'https://www.stockpredictorai.com'
      : 'http://localhost:5173';
  req.logout((err) => {
    if (err) { return next(err); }

    // Explicitly destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return next(err);
      }

      // Clear the session cookie
      res.clearCookie('connect.sid', {
        path: '/',
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        httpOnly: true
      });

      if (req.query.type === 'json') {
        return res.json({ success: true });
      }
      res.redirect(baseURL);
    });
  });
});

// GET: Current User
router.get('/current_user', (req, res) => {
  res.send(req.user);
});

module.exports = router;