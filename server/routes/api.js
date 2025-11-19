const express = require('express');
const router = express.Router();

// Mount domain-specific routers
// Note: All routes in these files are relative to the mount point of this router (which is /api in server.js)
// Since the sub-routers define their own paths (e.g., /users/:id), we mount them at '/' to preserve the full path.

router.use('/', require('./users'));
router.use('/', require('./predictions'));
router.use('/', require('./market'));
router.use('/', require('./notifications'));
router.use('/', require('./settings'));
router.use('/', require('./admin'));
router.use('/', require('./activity'));
router.use('/', require('./posts'));
router.use('/', require('./ai-wizard'));

module.exports = router;