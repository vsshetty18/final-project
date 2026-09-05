/**
 * backend/src/controllers/accident.controller.js
 *
 * HTTP layer for accident records: listing (dashboard/accidents
 * page, req #9), full details (req #10), and status updates.
 */

const accidentService = require('../services/accident.service');
const { asyncHandler } = require('../middleware/error.middleware');
const { success, notFound } = require('../utils/apiResponse.util');

/**
 * GET /api/accidents
 */
const listAccidents = asyncHandler(async (req, res) => {
  const { page, limit, severity, status, vehicleId, from, to } = req.query;

  const result = await accidentService.listAccidents({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    severity,
    status,
    vehicleId,
    from,
    to,
  });

  return success(res, {
    message: 'Accidents fetched successfully',
    data: result.accidents,
    meta: result.pagination,
  });
});

/**
 * GET /api/accidents/:id
 */
const getAccident = asyncHandler(async (req, res) => {
  const accident = await accidentService.getAccidentById(req.params.id);
  if (!accident) return notFound(res, 'Accident not found');
  return success(res, { message: 'Accident fetched successfully', data: accident });
});

/**
 * PATCH /api/accidents/:id/status
 */
const updateAccidentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const accident = await accidentService.updateAccidentStatus(req.params.id, status);
  return success(res, { message: 'Accident status updated successfully', data: accident });
});

module.exports = {
  listAccidents,
  getAccident,
  updateAccidentStatus,
};
