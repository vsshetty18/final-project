/**
 * backend/src/services/accidentDetection.service.js
 *
 * CORE ACCIDENT DETECTION ALGORITHM (rule-based prototype).
 *
 * ---------------------------------------------------------------
 * ALGORITHM OVERVIEW (explainable during viva):
 * ---------------------------------------------------------------
 * For every incoming sensor reading, we do NOT rely on speed alone
 * (a vehicle can be stationary and still be hit, or slow down
 * normally without crashing). Instead we combine THREE independent
 * signals, each contributing evidence toward a "possible accident"
 * classification:
 *
 *   1. DECELERATION  — a sudden drop in longitudinal acceleration
 *      (accelerationX, treated as the forward axis) beyond
 *      DECELERATION_THRESHOLD_G suggests hard braking or frontal
 *      impact.
 *
 *   2. IMPACT ACCELERATION SPIKE — the magnitude of the resultant
 *      3-axis acceleration vector:
 *          |a| = sqrt(ax^2 + ay^2 + az^2)
 *      A resultant magnitude beyond ACCELERATION_SPIKE_THRESHOLD_G
 *      suggests a physical impact (something hit the vehicle, or
 *      vice versa), since normal driving forces rarely exceed ~1-2g
 *      on any single reading.
 *
 *   3. ABNORMAL GYROSCOPIC MOVEMENT — the magnitude of the resultant
 *      angular velocity vector:
 *          |g| = sqrt(gx^2 + gy^2 + gz^2)
 *      A value beyond GYRO_ABNORMAL_THRESHOLD_DPS suggests the
 *      vehicle rotated, spun, or rolled abnormally — consistent with
 *      a collision rather than ordinary cornering.
 *
 * DECISION RULE:
 *   IF (deceleration exceeds threshold OR acceleration spike exceeds
 *      threshold) AND gyroscope indicates abnormal movement
 *   THEN flag as a strong candidate accident.
 *
 *   We ALSO allow a high-confidence single-signal trigger: if the
 *   acceleration spike is extreme (>= 1.5x threshold) we flag even
 *   without a large gyro reading, since some impacts (e.g. rear-end
 *   at a red light) may not produce major rotation.
 *
 * CONFIDENCE SCORE (0.0 - 1.0):
 *   We compute a normalized "how far past threshold" score for each
 *   of the three signals (capped at 1.0), then combine them with
 *   weights: acceleration spike is the strongest evidence, then
 *   deceleration, then gyroscope (which is more prone to noise).
 *
 *       confidence = 0.45 * accelScore
 *                  + 0.30 * decelScore
 *                  + 0.25 * gyroScore
 *
 *   The event is only classified as an accident if BOTH the rule
 *   condition is met AND confidence >= MIN_CONFIDENCE_TO_FLAG.
 * ---------------------------------------------------------------
 */

const { THRESHOLDS } = require('../constants/thresholds');
const { classifySeverity } = require('./severity.service');

/**
 * Compute the magnitude of a 3D vector.
 */
function vectorMagnitude(x, y, z) {
  return Math.sqrt(x * x + y * y + z * z);
}

/**
 * Normalize a raw value against a threshold into a 0-1 "how far past
 * threshold" score. A value at the threshold scores 1.0; values below
 * scale linearly toward 0; values well beyond cap at 1.0.
 */
function normalizedScore(value, threshold) {
  if (threshold <= 0) return 0;
  const ratio = value / threshold;
  return Math.max(0, Math.min(1, ratio));
}

/**
 * Analyze a single sensor reading (with optional previous reading for
 * deceleration comparison) and determine whether it represents a
 * possible accident.
 *
 * @param {object} reading - current sensor reading
 *   { speed, accelerationX, accelerationY, accelerationZ, gyroscopeX, gyroscopeY, gyroscopeZ }
 * @param {object|null} previousReading - most recent prior reading (for delta speed)
 * @returns {{
 *   isAccident: boolean,
 *   confidenceScore: number,
 *   severity: string,
 *   resultantAcceleration: number,
 *   resultantGyro: number,
 *   decelerationG: number,
 *   reasons: string[]
 * }}
 */
function analyzeReading(reading, previousReading = null) {
  const {
    accelerationX,
    accelerationY,
    accelerationZ,
    gyroscopeX,
    gyroscopeY,
    gyroscopeZ,
    speed,
  } = reading;

  const resultantAcceleration = vectorMagnitude(accelerationX, accelerationY, accelerationZ);
  const resultantGyro = vectorMagnitude(gyroscopeX, gyroscopeY, gyroscopeZ);

  // Deceleration: prefer explicit speed delta if a previous reading is
  // available (more physically meaningful); otherwise fall back to the
  // magnitude of the negative X-axis acceleration component.
  let decelerationG;
  if (previousReading && typeof previousReading.speed === 'number') {
    const speedDeltaKmh = previousReading.speed - speed; // positive = slowing down
    const timeDeltaSec = Math.max(
      0.1,
      (new Date(reading.timestamp).getTime() - new Date(previousReading.timestamp).getTime()) / 1000
    );
    // Convert km/h delta over time to g: 1g = 9.81 m/s^2; km/h -> m/s divide by 3.6
    const speedDeltaMs = speedDeltaKmh / 3.6;
    decelerationG = Math.max(0, speedDeltaMs / timeDeltaSec / 9.81);
  } else {
    decelerationG = Math.abs(Math.min(0, accelerationX));
  }

  const accelScore = normalizedScore(resultantAcceleration, THRESHOLDS.ACCELERATION_SPIKE_G);
  const decelScore = normalizedScore(decelerationG, THRESHOLDS.DECELERATION_G);
  const gyroScore = normalizedScore(resultantGyro, THRESHOLDS.GYRO_ABNORMAL_DPS);

  const confidenceScore = Math.round(
    (0.45 * accelScore + 0.3 * decelScore + 0.25 * gyroScore) * 100
  ) / 100;

  const reasons = [];
  const decelExceeded = decelerationG >= THRESHOLDS.DECELERATION_G;
  const accelExceeded = resultantAcceleration >= THRESHOLDS.ACCELERATION_SPIKE_G;
  const gyroExceeded = resultantGyro >= THRESHOLDS.GYRO_ABNORMAL_DPS;
  const accelExtreme = resultantAcceleration >= THRESHOLDS.ACCELERATION_SPIKE_G * 1.5;

  if (decelExceeded) reasons.push(`Sudden deceleration of ${decelerationG.toFixed(2)}g exceeded threshold (${THRESHOLDS.DECELERATION_G}g)`);
  if (accelExceeded) reasons.push(`Impact acceleration spike of ${resultantAcceleration.toFixed(2)}g exceeded threshold (${THRESHOLDS.ACCELERATION_SPIKE_G}g)`);
  if (gyroExceeded) reasons.push(`Abnormal rotational movement of ${resultantGyro.toFixed(2)} deg/s exceeded threshold (${THRESHOLDS.GYRO_ABNORMAL_DPS} deg/s)`);

  // Decision rule (see algorithm overview above).
  const ruleTriggered = ((decelExceeded || accelExceeded) && gyroExceeded) || accelExtreme;
  const isAccident = ruleTriggered && confidenceScore >= THRESHOLDS.MIN_CONFIDENCE;

  const severity = isAccident
    ? classifySeverity({ resultantAcceleration, confidenceScore })
    : null;

  return {
    isAccident,
    confidenceScore,
    severity,
    resultantAcceleration: Math.round(resultantAcceleration * 100) / 100,
    resultantGyro: Math.round(resultantGyro * 100) / 100,
    decelerationG: Math.round(decelerationG * 100) / 100,
    reasons,
  };
}

module.exports = {
  analyzeReading,
  vectorMagnitude,
  normalizedScore,
};
