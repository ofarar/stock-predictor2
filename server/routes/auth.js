const router = require('express').Router();
const passport = require('passport');

// Auth with Google
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'] // What we want from the user's profile
}));

// Callback route for Google to redirect to
router.get('/google/callback', passport.authenticate('google'), (req, res) => {
    // Successful authentication, redirect to the home page.
    res.redirect('http://localhost:3000/');
});
// Route to check current user
router.get('/current_user', (req, res) => {
    res.send(req.user); // req.user is automatically added by Passport
});

router.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('http://localhost:3000/');
    });
});

module.exports = router;