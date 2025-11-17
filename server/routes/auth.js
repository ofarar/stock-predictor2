const router = require('express').Router();
const passport = require('passport');

const { sendWelcomeEmail } = require('../services/email');

// Auth with Google
router.get('/google', (req, res, next) => {
  const redirectPath = req.query.redirect || '/';
  const referralCode = req.query.ref;
  // --- NEW: Save the referral code in the session ---
  if (referralCode) {
    req.session.referralCode = referralCode;
  }
  // --- END NEW ---
  const authenticator = passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: redirectPath // Pass the path in the state parameter
  });
  authenticator(req, res, next);
});

router.get(
  '/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { failureRedirect: '/' }, (err, user, info) => {
      if (err) { return next(err); }

      const baseURL =
        process.env.NODE_ENV === 'production'
          ? 'https://www.stockpredictorai.com'  // or 'https://stock-predictor2.pages.dev' if still using Pages domain
          : 'http://localhost:5173';

      // Handle case where username is taken
      if (info && info.action === 'CHOOSE_USERNAME') {
        req.session.pendingProfile = info.profile; // Store profile in session
        return res.redirect(`${baseURL}/complete-profile`);
      }

      if (!user) {
        // A generic failure case
        return res.redirect('/');
      }

      // Manually log the user in for a successful login/signup
      req.logIn(user, (err) => {
        if (err) { return next(err); }

        // Send welcome email for brand new users
        if (info && info.isNewUser) {
          sendWelcomeEmail(user.email, user.username);
        }

        const redirectPath = req.query.state || '/';
        return res.redirect(baseURL + redirectPath);
      });
    })(req, res, next);
  }
);

// Route to check current user
router.get('/current_user', (req, res) => {
  res.send(req.user); // req.user is automatically added by Passport
});

router.get('/logout', (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }

    const redirectURL =
      process.env.NODE_ENV === 'production'
        ? 'https://www.stockpredictorai.com'  // or 'https://stock-predictor2.pages.dev' if still using Pages domain
        : 'http://localhost:5173';

    res.redirect(redirectURL);
  });
});


module.exports = router;