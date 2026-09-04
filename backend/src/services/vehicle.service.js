/**
 * backend/src/services/vehicle.service.js
 *
 * Business logic for vehicle registration and management (req #1).
 * Controllers stay thin and delegate all Prisma access here.
 */

const prisma = require('../config/prisma');

/**
 * @param {object} data
 * @returns {Promise<object>}
 */
async function createVehicle(data) {
  return prisma.vehicle.create({
    data: {
      registrationNumber: data.registrationNumber,
      model: data.model,
      ownerName: data.ownerName,
      ownerPhone: data.ownerPhone,
      deviceId: data.deviceId || null,
      status: data.status || 'ACTIVE',
    },
  });
}

/**
 * @param {{page?:number, limit?:number, status?:string, search?:string}} params
 */
async function listVehicles({ page = 1, limit = 20, status, search } = {}) {
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { registrationNumber: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { ownerName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return {
    vehicles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function getVehicleById(id) {
  return prisma.vehicle.findUnique({
    where: { id },
    include: {
      accidents: {
        orderBy: { occurredAt: 'desc' },
        take: 10,
      },
    },
  });
}

/**
 * @param {string} deviceId
 * @returns {Promise<object|null>}
 */
async function getVehicleByDeviceId(deviceId) {
  return prisma.vehicle.findUnique({ where: { deviceId } });
}

/**
 * @param {string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
async function updateVehicle(id, data) {
  return prisma.vehicle.update({
    where: { id },
    data,
  });
}

/**
 * @param {string} id
 * @returns {Promise<object>}
 */
async function deleteVehicle(id) {
  return prisma.vehicle.delete({ where: { id } });
}

/**
 * Fetch recent sensor readings for a specific vehicle (used on the
 * vehicle details page).
 * @param {string} vehicleId
 * @param {number} limit
 */
async function getRecentSensorReadings(vehicleId, limit = 50) {
  return prisma.sensorReading.findMany({
    where: { vehicleId },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}

module.exports = {
  createVehicle,
  listVehicles,
  getVehicleById,
  getVehicleByDeviceId,
  updateVehicle,
  deleteVehicle,
  getRecentSensorReadings,
};
