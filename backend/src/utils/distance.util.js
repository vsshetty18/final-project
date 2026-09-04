/**
 * backend/src/utils/distance.util.js
 *
 * Great-circle distance calculations between GPS coordinates using
 * the Haversine formula. Used by the geo-lookup service to find the
 * nearest police station / hospital, and to compute displayed
 * distances on the accident details map.
 */

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate the great-circle distance between two lat/lng points.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in kilometers, rounded to 2 decimal places
 */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    Number.isNaN(lat1) ||
    Number.isNaN(lon1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lon2)
  ) {
    throw new Error('haversineDistanceKm: all coordinates must be valid numbers');
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Given an origin point and a list of candidate locations, return the
 * candidates sorted by ascending distance, each annotated with
 * `distanceKm`.
 * @param {{latitude:number, longitude:number}} origin
 * @param {Array<{latitude:number, longitude:number, [key:string]:any}>} candidates
 * @returns {Array} sorted list with distanceKm attached
 */
function sortByDistance(origin, candidates) {
  return candidates
    .map((c) => ({
      ...c,
      distanceKm: haversineDistanceKm(origin.latitude, origin.longitude, c.latitude, c.longitude),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Return the single nearest candidate within an optional max radius.
 * @param {{latitude:number, longitude:number}} origin
 * @param {Array} candidates
 * @param {number|null} maxRadiusKm
 * @returns {object|null}
 */
function findNearest(origin, candidates, maxRadiusKm = null) {
  if (!candidates || candidates.length === 0) return null;
  const sorted = sortByDistance(origin, candidates);
  const nearest = sorted[0];
  if (maxRadiusKm !== null && nearest.distanceKm > maxRadiusKm) {
    return null;
  }
  return nearest;
}

module.exports = {
  haversineDistanceKm,
  sortByDistance,
  findNearest,
};
