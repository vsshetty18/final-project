/**
 * backend/src/routes/auth.routes.js
 *
 * Routes: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
 */

const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const validate = require('../middleware/validate.middleware');
const { registerValidator, loginValidator } = require('../utils/validators');

const router = express.Router();

router.post('/register', authLimiter, registerValidator, validate, authController.register);
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
