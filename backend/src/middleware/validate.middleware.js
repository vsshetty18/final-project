/**
 * backend/src/middleware/validate.middleware.js
 *
 * Runs after any express-validator chain array. Collects validation
 * errors (if any) and returns a standardized 400 response; otherwise
 * passes control to the next handler.
 */

const { validationResult } = require('express-validator');
const { badRequest } = require('../utils/apiResponse.util');

function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path || e.param,
      message: e.msg,
    }));
    return badRequest(res, 'Validation failed', formatted);
  }

  return next();
}

module.exports = validate;
