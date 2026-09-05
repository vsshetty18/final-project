/**
 * backend/src/controllers/dashboard.controller.js
 *
 * HTTP layer for dashboard statistics (req #9).
 */

const dashboardService = require('../services/dashboard.service');
const { asyncHandler } = require('../middleware/error.middleware');
const { success } = require('../utils/apiResponse.util');

/**
 * GET /api/dashboard/stats
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await dashboardService.getDashboardStats();
  return success(res, { message: 'Dashboard stats fetched successfully', data: stats });
});

/**
 * GET /api/dashboard/severity-breakdown
 */
const getSeverityBreakdown = asyncHandler(async (req, res) => {
  const breakdown = await dashboardService.getSeverityBreakdown();
  return success(res, { message: 'Severity breakdown fetched successfully', data: breakdown });
});

/**
 * GET /api/dashboard/trend?days=7
 */
const getTrend = asyncHandler(async (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 7;
  const trend = await dashboardService.getAccidentTrend(days);
  return success(res, { message: 'Accident trend fetched successfully', data: trend });
});

module.exports = {
  getStats,
  getSeverityBreakdown,
  getTrend,
};
