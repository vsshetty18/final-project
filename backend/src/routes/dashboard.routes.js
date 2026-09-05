/**
 * backend/src/routes/dashboard.routes.js
 *
 * Routes for dashboard statistics (req #9). All routes require
 * authentication.
 */

const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/stats', dashboardController.getStats);
router.get('/severity-breakdown', dashboardController.getSeverityBreakdown);
router.get('/trend', dashboardController.getTrend);

module.exports = router;
