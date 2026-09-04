/**
 * backend/src/services/geoLookup.service.js
 *
 * Emergency-location lookup abstraction.
 *
 * ---------------------------------------------------------------
 * DESIGN (explainable during viva):
 * ---------------------------------------------------------------
 * The rest of the system (accident.service.js) only calls
 * `findNearestPoliceStation(coords)` and `findNearestHospital(coords)`.
 * It never needs to know HOW the nearest agency was found. This
 * abstraction lets us swap the underlying implementation:
 *
 *   - GEO_LOOKUP_MODE=mock  (default): queries our own seeded
 *     PoliceStation / Hospital tables in PostgreSQL and computes the
 *     nearest one using the Haversine formula. Fully self-contained,
 *     requires no external API key — safe default for the academic
 *     demo and viva.
 *
 *   - GEO_LOOKUP_MODE=live: intended for a real Places API (e.g.
 *     Google Places, OpenStreetMap Overpass API) once a PLACES_API_KEY
 *     is provided. The live branch is stubbed with a clear extension
 *     point and falls back to mock mode if no key is configured, so
 *     the system never silently fails.
 *
 * This satisfies the requirement: "keep the API integration behind
 * an abstraction/service and provide a mock/demo implementation".
 * ---------------------------------------------------------------
 */

const prisma = require('../config/prisma');
const env = require('../config/env');
const logger = require('../config/logger');
const { findNearest } = require('../utils/distance.util');

/**
 * Mock implementation: nearest PoliceStation from our own seeded table.
 */
async function findNearestPoliceStationMock({ latitude, longitude }) {
  const stations = await prisma.policeStation.findMany();
  return findNearest({ latitude, longitude }, stations, env.GEO_SEARCH_RADIUS_KM);
}

/**
 * Mock implementation: nearest Hospital from our own seeded table.
 */
async function findNearestHospitalMock({ latitude, longitude }) {
  const hospitals = await prisma.hospital.findMany();
  return findNearest({ latitude, longitude }, hospitals, env.GEO_SEARCH_RADIUS_KM);
}

/**
 * Live implementation placeholder.
 *
 * A real integration (e.g. Google Places Nearby Search, or the
 * OpenStreetMap Overpass API which needs no key) would be called
 * here using env.PLACES_API_KEY. To keep this academic prototype
 * free of hard dependencies on paid/external services, we only wire
 * the abstraction and fall back to mock data if no key is present.
 */
async function findNearestPoliceStationLive(coords) {
  if (!env.PLACES_API_KEY) {
    logger.warn('GEO_LOOKUP_MODE=live but PLACES_API_KEY is not set — falling back to mock data');
    return findNearestPoliceStationMock(coords);
  }
  // TODO (future hardware/production integration):
  // Call a real places API here using env.PLACES_API_KEY and map the
  // response into the same shape returned by the mock implementation:
  // { id, name, address, phone, latitude, longitude, distanceKm }
  logger.warn('Live geo lookup is not implemented in this academic prototype — using mock data');
  return findNearestPoliceStationMock(coords);
}

async function findNearestHospitalLive(coords) {
  if (!env.PLACES_API_KEY) {
    logger.warn('GEO_LOOKUP_MODE=live but PLACES_API_KEY is not set — falling back to mock data');
    return findNearestHospitalMock(coords);
  }
  // TODO (future hardware/production integration): same as above.
  logger.warn('Live geo lookup is not implemented in this academic prototype — using mock data');
  return findNearestHospitalMock(coords);
}

/**
 * Public API — always used by the rest of the system.
 * @param {{latitude:number, longitude:number}} coords
 * @returns {Promise<object|null>}
 */
async function findNearestPoliceStation(coords) {
  if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
    throw new Error('findNearestPoliceStation: valid coordinates are required');
  }
  return env.GEO_LOOKUP_MODE === 'live'
    ? findNearestPoliceStationLive(coords)
    : findNearestPoliceStationMock(coords);
}

/**
 * @param {{latitude:number, longitude:number}} coords
 * @returns {Promise<object|null>}
 */
async function findNearestHospital(coords) {
  if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
    throw new Error('findNearestHospital: valid coordinates are required');
  }
  return env.GEO_LOOKUP_MODE === 'live'
    ? findNearestHospitalLive(coords)
    : findNearestHospitalMock(coords);
}

module.exports = {
  findNearestPoliceStation,
  findNearestHospital,
};
