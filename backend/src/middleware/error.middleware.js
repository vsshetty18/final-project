/**
 * backend/src/middleware/error.middleware.js
 *
 * Centralized error handler (req #16 — graceful error handling).
 * Every route/controller either calls next(err) on failure or lets
 * an async error bubble up via the asyncHandler wrapper (see
 * utils below) — this middleware is the single place that turns any
 * error into a safe, consistent JSON response without leaking stack
 * traces or internals to the client.
 */

const logger = require('../config/logger');
const env = require('../config/env');
const { error: errorResponse } = require('../utils/apiResponse.util');

/**
 * Wrap async route handlers so thrown errors/rejected promises are
 * automatically forwarded to the error middleware instead of
 * crashing the process or hanging the request.
 * Usage: router.get('/x', asyncHandler(async (req, res) => {...}))
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler for unmatched routes.
 */
function notFoundHandler(req, res) {
  return errorResponse(res, {
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Final error-handling middleware (must have 4 args for Express to
 * recognize it as an error handler).
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', {
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    stack: env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  // Prisma known request errors (e.g. unique constraint violations).
  if (err.code === 'P2002') {
    return errorResponse(res, {
      statusCode: 409,
      message: `A record with this ${Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'value'} already exists.`,
    });
  }
  if (err.code === 'P2025') {
    return errorResponse(res, {
      statusCode: 404,
      message: 'The requested record was not found.',
    });
  }
  if (err.code === 'P2003') {
    return errorResponse(res, {
      statusCode: 400,
      message: 'This operation references a record that does not exist.',
    });
  }

  // JWT errors.
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return errorResponse(res, { statusCode: 401, message: 'Invalid or expired authentication token.' });
  }

  // Errors we deliberately threw with a statusCode (see services).
  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500 && env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'An unexpected error occurred.';

  return errorResponse(res, { statusCode, message });
}

module.exports = {
  asyncHandler,
  notFoundHandler,
  errorHandler,
};
