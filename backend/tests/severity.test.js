/**
 * backend/tests/severity.test.js
 *
 * Unit tests for severity.service.js — severity band classification
 * and confidence-based downgrade logic (req #22).
 */

const {
  classifySeverity,
  baseSeverityFromAcceleration,
  SEVERITY_ORDER,
} = require('../src/services/severity.service');

describe('severity.service', () => {
  describe('baseSeverityFromAcceleration', () => {
    test('classifies low acceleration as MINOR', () => {
      expect(baseSeverityFromAcceleration(2)).toBe('MINOR');
    });

    test('classifies moderate acceleration as MODERATE', () => {
      expect(baseSeverityFromAcceleration(5.5)).toBe('MODERATE');
    });

    test('classifies high acceleration as SEVERE', () => {
      expect(baseSeverityFromAcceleration(8.5)).toBe('SEVERE');
    });

    test('classifies extreme acceleration as CRITICAL', () => {
      expect(baseSeverityFromAcceleration(15)).toBe('CRITICAL');
    });
  });

  describe('classifySeverity', () => {
    test('high acceleration with strong confidence stays at its band', () => {
      const severity = classifySeverity({
        resultantAcceleration: 12,
        confidenceScore: 0.95,
      });
      expect(severity).toBe('CRITICAL');
    });

    test('high acceleration with marginal confidence is downgraded one band', () => {
      const severity = classifySeverity({
        resultantAcceleration: 12, // would be CRITICAL
        confidenceScore: 0.56, // just above default MIN_CONFIDENCE (0.55)
      });
      const criticalIndex = SEVERITY_ORDER.indexOf('CRITICAL');
      const resultIndex = SEVERITY_ORDER.indexOf(severity);
      expect(resultIndex).toBeLessThan(criticalIndex);
    });

    test('MINOR severity cannot be downgraded below MINOR', () => {
      const severity = classifySeverity({
        resultantAcceleration: 1,
        confidenceScore: 0.56,
      });
      expect(severity).toBe('MINOR');
    });
  });
});
