/**
 * backend/src/controllers/auth.controller.js
 *
 * Thin HTTP layer for authentication endpoints. Delegates all logic
 * to auth.service.js.
 */

const authService = require('../services/auth.service');
const { asyncHandler } = require('../middleware/error.middleware');
const { success, created } = require('../utils/apiResponse.util');

/**
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const user = await authService.registerUser({ name, email, password, role });
  return created(res, { message: 'User registered successfully', data: user });
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await authService.loginUser({ email, password });
  return success(res, { message: 'Login successful', data: { user, token } });
});

/**
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getUserById(req.user.id);
  return success(res, { message: 'Current user fetched', data: user });
});

module.exports = {
  register,
  login,
  getMe,
};
