/**
 * backend/src/services/severity.service.js
 *
 * Classifies accident severity from the resultant peak acceleration
 * (in g) and the detection confidence score.
 *
 * ---------------------------------------------------------------
 * ALGORITHM (explainable during viva):
 * ---------------------------------------------------------------
 * 1. Start from the SEVERITY_BANDS defined in constants/thresholds.js,
 *    which map resultant acceleration magnitude to a base severity:
 *
 *        <= 4.0g   -> MINOR
 *        <= 7.0g   -> MODERATE
 *        <= 10.0g  -> SEVERE
 *        > 10.0g   -> CRITICAL
 *
 * 2. Adjust the base severity using the confidence score as a
 *    modifier: if confidence is very low (close to the minimum
 *    threshold) we avoid over-classifying a borderline event as
 *    CRITICAL, and cap it one band lower. This keeps severity from
 *    being purely a function of one noisy sensor value.
 * ---------------------------------------------------------------
 */

const { SEVERITY_BANDS, THRESHOLDS } = require('../constants/thresholds');

const SEVERITY_ORDER = ['MINOR', 'MODERATE', 'SEVERE', 'CRITICAL'];

function baseSeverityFromAcceleration(resultantAcceleration) {
  const band = SEVERITY_BANDS.find((b) => resultantAcceleration <= b.max);
  return band ? band.label : 'CRITICAL';
}

/**
 * @param {{resultantAcceleration:number, confidenceScore:number}} params
 * @returns {string} one of MINOR | MODERATE | SEVERE | CRITICAL
 */
function classifySeverity({ resultantAcceleration, confidenceScore }) {
  let severity = baseSeverityFromAcceleration(resultantAcceleration);

  // If confidence is only marginally above the minimum flag threshold,
  // treat the event more conservatively (one band lower, floor at MINOR).
  const confidenceMargin = confidenceScore - THRESHOLDS.MIN_CONFIDENCE;
  const isMarginalConfidence = confidenceMargin < 0.1;

  if (isMarginalConfidence) {
    const currentIndex = SEVERITY_ORDER.indexOf(severity);
    const downgradedIndex = Math.max(0, currentIndex - 1);
    severity = SEVERITY_ORDER[downgradedIndex];
  }

  return severity;
}

module.exports = {
  classifySeverity,
  baseSeverityFromAcceleration,
  SEVERITY_ORDER,
};
