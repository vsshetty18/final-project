/**
 * backend/src/controllers/vehicle.controller.js
 *
 * HTTP layer for vehicle management (req #1).
 */

const vehicleService = require('../services/vehicle.service');
const { asyncHandler } = require('../middleware/error.middleware');
const { success, created, notFound } = require('../utils/apiResponse.util');

/**
 * POST /api/vehicles
 */
const createVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.createVehicle(req.body);
  return created(res, { message: 'Vehicle registered successfully', data: vehicle });
});

/**
 * GET /api/vehicles
 */
const listVehicles = asyncHandler(async (req, res) => {
  const { page, limit, status, search } = req.query;
  const result = await vehicleService.listVehicles({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    status,
    search,
  });
  return success(res, {
    message: 'Vehicles fetched successfully',
    data: result.vehicles,
    meta: result.pagination,
  });
});

/**
 * GET /api/vehicles/:id
 */
const getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.getVehicleById(req.params.id);
  if (!vehicle) return notFound(res, 'Vehicle not found');
  return success(res, { message: 'Vehicle fetched successfully', data: vehicle });
});

/**
 * GET /api/vehicles/:id/sensor-readings
 */
const getVehicleSensorReadings = asyncHandler(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const readings = await vehicleService.getRecentSensorReadings(req.params.id, limit);
  return success(res, { message: 'Sensor readings fetched successfully', data: readings });
});

/**
 * PUT /api/vehicles/:id
 */
const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.updateVehicle(req.params.id, req.body);
  return success(res, { message: 'Vehicle updated successfully', data: vehicle });
});

/**
 * DELETE /api/vehicles/:id
 */
const deleteVehicle = asyncHandler(async (req, res) => {
  await vehicleService.deleteVehicle(req.params.id);
  return success(res, { message: 'Vehicle deleted successfully' });
});

module.exports = {
  createVehicle,
  listVehicles,
  getVehicle,
  getVehicleSensorReadings,
  updateVehicle,
  deleteVehicle,
};
