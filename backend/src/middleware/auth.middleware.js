/**
 * backend/src/middleware/auth.middleware.js
 *
 * JWT authentication middleware (req #15 security).
 * Verifies the Bearer token on protected routes and attaches the
 * decoded user payload to req.user. Also exposes a role guard for
 * admin-only endpoints.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { unauthorized, forbidden } = require('../utils/apiResponse.util');

/**
 * Requires a valid JWT in the Authorization header:
 *   Authorization: Bearer <token>
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'Authentication token is missing');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
    return next();
  } catch (err) {
    return unauthorized(res, 'Invalid or expired authentication token');
  }
}

/**
 * Restrict a route to specific roles. Use AFTER requireAuth.
 * @param {...string} allowedRoles
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res, 'Authentication required');
    }
    if (!allowedRoles.includes(req.user.role)) {
      return forbidden(res, 'You do not have permission to perform this action');
    }
    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
