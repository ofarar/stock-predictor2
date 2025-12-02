const router = require('express').Router();
const passport = require('passport');
const crypto = require('crypto'); // Built-in Node.js crypto
const User = require('../models/User'); // Ensure User model is imported for exchange
const { sendWelcomeEmail } = require('../services/email');

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
        return res.redirect('/');
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
        return res.redirect(baseURL + redirectPath);
      });
    })(req, res, next);
  }
);

// --- NEW: Mobile Token Exchange Endpoint ---
router.post('/mobile-exchange', async (req, res) => {
  const { token } = req.body;

  if (!token || !mobileAuthTokens.has(token)) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const data = mobileAuthTokens.get(token);

  // Double check expiration
  if (data.expires < Date.now()) {
    mobileAuthTokens.delete(token);
    return res.status(401).json({ error: 'Token expired' });
  }

  // Consume token (One-time use)
  mobileAuthTokens.delete(token);

  try {
    const user = await User.findById(data.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log the user in (creates session cookie)
    req.logIn(user, (err) => {
      if (err) return res.status(500).json({ error: 'Login failed' });
      return res.json({ success: true, user });
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
// -------------------------------------------

// POST: Dev Login (Only for development)
router.post('/dev/login', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }
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