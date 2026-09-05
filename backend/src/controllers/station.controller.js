/**
 * backend/src/controllers/station.controller.js
 *
 * HTTP layer for Police Station and Hospital records (req #6, #7).
 * Combined into one controller since both entities share identical
 * shape and operations; kept as separate Prisma models per the
 * database design (req #13).
 */

const prisma = require('../config/prisma');
const { asyncHandler } = require('../middleware/error.middleware');
const { success, created, notFound } = require('../utils/apiResponse.util');

/**
 * GET /api/police-stations
 */
const listPoliceStations = asyncHandler(async (req, res) => {
  const stations = await prisma.policeStation.findMany({ orderBy: { name: 'asc' } });
  return success(res, { message: 'Police stations fetched successfully', data: stations });
});

/**
 * GET /api/police-stations/:id
 */
const getPoliceStation = asyncHandler(async (req, res) => {
  const station = await prisma.policeStation.findUnique({ where: { id: req.params.id } });
  if (!station) return notFound(res, 'Police station not found');
  return success(res, { message: 'Police station fetched successfully', data: station });
});

/**
 * POST /api/police-stations  (admin only)
 */
const createPoliceStation = asyncHandler(async (req, res) => {
  const station = await prisma.policeStation.create({ data: req.body });
  return created(res, { message: 'Police station created successfully', data: station });
});

/**
 * GET /api/hospitals
 */
const listHospitals = asyncHandler(async (req, res) => {
  const hospitals = await prisma.hospital.findMany({ orderBy: { name: 'asc' } });
  return success(res, { message: 'Hospitals fetched successfully', data: hospitals });
});

/**
 * GET /api/hospitals/:id
 */
const getHospital = asyncHandler(async (req, res) => {
  const hospital = await prisma.hospital.findUnique({ where: { id: req.params.id } });
  if (!hospital) return notFound(res, 'Hospital not found');
  return success(res, { message: 'Hospital fetched successfully', data: hospital });
});

/**
 * POST /api/hospitals  (admin only)
 */
const createHospital = asyncHandler(async (req, res) => {
  const hospital = await prisma.hospital.create({ data: req.body });
  return created(res, { message: 'Hospital created successfully', data: hospital });
});

module.exports = {
  listPoliceStations,
  getPoliceStation,
  createPoliceStation,
  listHospitals,
  getHospital,
  createHospital,
};
