const router = require('express').Router();
const passport = require('passport');

// Auth with Google
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'] // What we want from the user's profile
}));

// Callback route for Google to redirect to
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // --- ADD THIS CRITICAL DEBUGGING LOG ---
    console.log('--- GOOGLE CALLBACK SUCCESS! I AM HERE! ---');
    // ---------------------------------------------

    const redirectURL =
      process.env.NODE_ENV === 'production'
        ? 'https://predictostock.vercel.app'
        : 'http://localhost:3000';

    res.redirect(redirectURL);
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