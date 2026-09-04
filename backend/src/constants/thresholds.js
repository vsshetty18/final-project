/**
 * backend/src/constants/thresholds.js
 *
 * Central place documenting and exporting the configurable
 * accident-detection thresholds. Values are sourced from env.js
 * (which reads process.env), so thresholds can be tuned per
 * deployment/demo WITHOUT changing code.
 *
 * ---------------------------------------------------------------
 * RATIONALE (explainable during viva):
 * ---------------------------------------------------------------
 * Real crash-detection systems (e.g. airbag ECUs) typically trigger
 * around 4-8g of sudden deceleration. Because this is a low-cost
 * MPU6050/MPU9250-based academic prototype (not automotive-grade),
 * we use conservative, configurable thresholds:
 *
 *  - DECELERATION_THRESHOLD_G: a sudden drop in forward accel
 *    beyond this magnitude (in g) suggests a hard braking event or
 *    frontal impact.
 *
 *  - ACCELERATION_SPIKE_THRESHOLD_G: a spike in the resultant
 *    acceleration vector beyond this magnitude suggests a physical
 *    impact (the vehicle was struck or struck something).
 *
 *  - GYRO_ABNORMAL_THRESHOLD_DPS: abnormal angular velocity
 *    (degrees/sec) on any axis suggests the vehicle rotated/rolled/
 *    spun in a way inconsistent with normal driving or braking.
 *
 *  - MIN_CONFIDENCE_TO_FLAG: the computed confidence score (0-1)
 *    must meet this bar before an event is classified as a possible
 *    accident, to reduce false positives from potholes/speed bumps.
 *
 *  - ACCIDENT_COOLDOWN_SECONDS: minimum time between two accident
 *    detections for the SAME vehicle, to avoid duplicate records
 *    from one continuous crash event generating many sensor spikes.
 *
 *  - SENSOR_BUFFER_WINDOW_SECONDS: how much recent sensor history
 *    per vehicle is kept in memory so we can look "backwards" to
 *    find speed/acceleration just before impact.
 * ---------------------------------------------------------------
 */

const env = require('../config/env');

const THRESHOLDS = {
  DECELERATION_G: env.DECELERATION_THRESHOLD_G,
  ACCELERATION_SPIKE_G: env.ACCELERATION_SPIKE_THRESHOLD_G,
  GYRO_ABNORMAL_DPS: env.GYRO_ABNORMAL_THRESHOLD_DPS,
  MIN_CONFIDENCE: env.MIN_CONFIDENCE_TO_FLAG,
  COOLDOWN_SECONDS: env.ACCIDENT_COOLDOWN_SECONDS,
  BUFFER_WINDOW_SECONDS: env.SENSOR_BUFFER_WINDOW_SECONDS,
};

// Severity is derived from the resultant peak acceleration (in g)
// AND the confidence score. These bands are intentionally simple
// and documented so they're easy to explain and defend in a viva.
const SEVERITY_BANDS = [
  { max: 4.0, label: 'MINOR' },
  { max: 7.0, label: 'MODERATE' },
  { max: 10.0, label: 'SEVERE' },
  { max: Infinity, label: 'CRITICAL' },
];

module.exports = {
  THRESHOLDS,
  SEVERITY_BANDS,
};
