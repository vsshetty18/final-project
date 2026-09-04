/**
 * backend/src/utils/apiResponse.util.js
 *
 * Standardized success/error response shapes so every endpoint in
 * the API returns a consistent envelope. Makes the frontend's
 * axios interceptor and error handling predictable.
 */

function success(res, { statusCode = 200, message = 'Success', data = null, meta = null } = {}) {
  const body = {
    success: true,
    message,
    data,
  };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

function created(res, { message = 'Created successfully', data = null } = {}) {
  return success(res, { statusCode: 201, message, data });
}

function error(res, { statusCode = 500, message = 'Something went wrong', errors = null } = {}) {
  const body = {
    success: false,
    message,
  };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

function notFound(res, message = 'Resource not found') {
  return error(res, { statusCode: 404, message });
}

function badRequest(res, message = 'Invalid request', errors = null) {
  return error(res, { statusCode: 400, message, errors });
}

function unauthorized(res, message = 'Unauthorized') {
  return error(res, { statusCode: 401, message });
}

function forbidden(res, message = 'Forbidden') {
  return error(res, { statusCode: 403, message });
}

function conflict(res, message = 'Conflict') {
  return error(res, { statusCode: 409, message });
}

module.exports = {
  success,
  created,
  error,
  notFound,
  badRequest,
  unauthorized,
  forbidden,
  conflict,
};
