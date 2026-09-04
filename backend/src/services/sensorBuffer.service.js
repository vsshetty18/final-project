/**
 * backend/src/services/sensorBuffer.service.js
 *
 * Maintains an in-memory rolling buffer of recent sensor readings
 * PER VEHICLE. This is what allows the system to answer:
 *   "What was the speed immediately BEFORE impact?"
 * even though by the time we detect the accident, the "current"
 * reading is already the post-impact one.
 *
 * Design notes (important for viva explanation):
 *  - Each vehicle gets its own FIFO buffer capped by a time window
 *    (SENSOR_BUFFER_WINDOW_SECONDS), not just a fixed count, so the
 *    buffer adapts naturally to different sensor sending frequencies.
 *  - The buffer lives in server memory (Map), which is acceptable
 *    for a single-instance academic prototype. For production-scale
 *    multi-instance deployment this would move to Redis — documented
 *    as a future enhancement in docs/architecture.md.
 *  - Every sensor reading is ALSO persisted to the SensorReading
 *    table by sensor.service.js regardless of buffer state, so no
 *    data is lost — the buffer is purely a fast in-memory index for
 *    detection purposes.
 */

const { THRESHOLDS } = require('../constants/thresholds');
const logger = require('../config/logger');

/** @type {Map<string, Array<object>>} vehicleId -> array of readings (oldest first) */
const buffers = new Map();

/**
 * Push a new reading into a vehicle's rolling buffer, evicting
 * anything older than the configured time window.
 * @param {string} vehicleId
 * @param {object} reading - must include `timestamp` (Date) and sensor fields
 */
function pushReading(vehicleId, reading) {
  if (!buffers.has(vehicleId)) {
    buffers.set(vehicleId, []);
  }
  const buffer = buffers.get(vehicleId);
  buffer.push(reading);

  const windowMs = THRESHOLDS.BUFFER_WINDOW_SECONDS * 1000;
  const cutoff = Date.now() - windowMs;

  // Evict old readings from the front of the buffer.
  while (buffer.length > 0 && new Date(buffer[0].timestamp).getTime() < cutoff) {
    buffer.shift();
  }

  logger.debug('Sensor buffer updated', { vehicleId, bufferSize: buffer.length });
}

/**
 * Get the full current buffer for a vehicle (oldest first).
 * @param {string} vehicleId
 * @returns {Array<object>}
 */
function getBuffer(vehicleId) {
  return buffers.get(vehicleId) || [];
}

/**
 * Given the reading that triggered accident detection (the "impact"
 * reading), find the most relevant "before impact" reading from the
 * buffer — the reading immediately preceding it in time.
 * @param {string} vehicleId
 * @param {object} impactReading
 * @returns {object|null}
 */
function getReadingBeforeImpact(vehicleId, impactReading) {
  const buffer = getBuffer(vehicleId);
  const impactTime = new Date(impactReading.timestamp).getTime();

  // Find readings strictly before the impact reading, take the latest one.
  const before = buffer.filter((r) => new Date(r.timestamp).getTime() < impactTime);
  if (before.length === 0) return null;
  return before[before.length - 1];
}

/**
 * Return the full ordered timeline of readings from the buffer that
 * are relevant to the accident (used to build AccidentSensorSnapshot
 * rows and the frontend's sensor timeline chart).
 * @param {string} vehicleId
 * @param {object} impactReading
 * @returns {{before: object[], impact: object, after: object[]}}
 */
function getAccidentTimeline(vehicleId, impactReading) {
  const buffer = getBuffer(vehicleId);
  const impactTime = new Date(impactReading.timestamp).getTime();

  const before = buffer.filter((r) => new Date(r.timestamp).getTime() < impactTime);
  const after = buffer.filter((r) => new Date(r.timestamp).getTime() > impactTime);

  return { before, impact: impactReading, after };
}

/**
 * Clear a vehicle's buffer (used mainly in tests, or when a vehicle
 * is deactivated).
 * @param {string} vehicleId
 */
function clearBuffer(vehicleId) {
  buffers.delete(vehicleId);
}

/**
 * Clear ALL buffers (used in tests to ensure isolation between cases).
 */
function clearAllBuffers() {
  buffers.clear();
}

module.exports = {
  pushReading,
  getBuffer,
  getReadingBeforeImpact,
  getAccidentTimeline,
  clearBuffer,
  clearAllBuffers,
};
