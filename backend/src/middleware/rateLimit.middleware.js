/**
 * backend/src/middleware/rateLimit.middleware.js
 *
 * Rate limiting (req #15 security) using express-rate-limit.
 * Two limiters are exported:
 *   - generalLimiter: applied globally to all /api routes.
 *   - sensorDataLimiter: a more permissive limiter specifically for
 *     POST /api/sensor-data, since a real ESP32 or the simulator may
 *     legitimately send readings frequently (e.g. every 1-2 seconds).
 */

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests — please slow down and try again shortly.',
  },
});

const sensorDataLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: Math.max(env.RATE_LIMIT_MAX_REQUESTS * 5, 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many sensor data submissions — please slow down.',
  },
});

const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts — please try again shortly.',
  },
});

module.exports = {
  generalLimiter,
  sensorDataLimiter,
  authLimiter,
};
