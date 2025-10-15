const router = require('express').Router();
const passport = require('passport');

const { sendWelcomeEmail } = require('../services/email');

// Auth with Google
router.get('/google', (req, res, next) => {
  const redirectPath = req.query.redirect || '/';
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
      if (!user) { return res.redirect('/'); }

      // Manually log the user in
      req.logIn(user, (err) => {
        if (err) { return next(err); }

        // Check if this is a new user
        if (info && info.isNewUser) {
          sendWelcomeEmail(user.email, user.username);
        }

        const baseURL =
          process.env.NODE_ENV === 'production'
            ? 'https://predictostock.vercel.app'
            : 'http://localhost:3000';

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
        ? 'https://predictostock.vercel.app'
        : 'http://localhost:3000';

    res.redirect(redirectURL);
  });
});


module.exports = router;