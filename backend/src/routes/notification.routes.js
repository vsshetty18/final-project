/**
 * backend/src/routes/notification.routes.js
 *
 * Routes for notification records (req #8). All routes require
 * authentication.
 */

const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', notificationController.listNotifications);
router.get('/:id', notificationController.getNotification);
router.patch('/:id/acknowledge', notificationController.acknowledgeNotification);

module.exports = router;
