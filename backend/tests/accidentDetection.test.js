/**
 * backend/tests/accidentDetection.test.js
 *
 * Unit tests for accidentDetection.service.js — the core rule-based
 * detection algorithm (req #22).
 */

const { analyzeReading } = require('../src/services/accidentDetection.service');

function baseReading(overrides = {}) {
  return {
    timestamp: new Date().toISOString(),
    speed: 45,
    accelerationX: 0.1,
    accelerationY: 0.05,
    accelerationZ: 0.98,
    gyroscopeX: 2,
    gyroscopeY: 1,
    gyroscopeZ: 1,
    ...overrides,
  };
}

describe('accidentDetection.service - analyzeReading', () => {
  test('normal driving does NOT trigger an accident', () => {
    const reading = baseReading();
    const result = analyzeReading(reading, null);

    expect(result.isAccident).toBe(false);
    expect(result.severity).toBeNull();
  });

  test('sudden braking alone (no abnormal rotation) does NOT trigger an accident', () => {
    const previous = baseReading({
      speed: 50,
      timestamp: new Date(Date.now() - 1000).toISOString(),
    });
    const current = baseReading({
      speed: 8, // sharp drop -> high deceleration
      accelerationX: -3.8,
      gyroscopeX: 5, // stays low
      gyroscopeY: 5,
      gyroscopeZ: 5,
      timestamp: new Date().toISOString(),
    });

    const result = analyzeReading(current, previous);

    expect(result.isAccident).toBe(false);
  });

  test('severe collision (high acceleration spike + abnormal gyro) DOES trigger an accident', () => {
    const previous = baseReading({
      speed: 55,
      timestamp: new Date(Date.now() - 1000).toISOString(),
    });
    const current = baseReading({
      speed: 5,
      accelerationX: -8,
      accelerationY: 5,
      accelerationZ: 3.5,
      gyroscopeX: 320,
      gyroscopeY: -280,
      gyroscopeZ: 260,
      timestamp: new Date().toISOString(),
    });

    const result = analyzeReading(current, previous);

    expect(result.isAccident).toBe(true);
    expect(result.severity).toBeDefined();
    expect(['MODERATE', 'SEVERE', 'CRITICAL']).toContain(result.severity);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  test('extreme acceleration alone (no gyro) still triggers via the extreme-spike rule', () => {
    const current = baseReading({
      accelerationX: -9,
      accelerationY: 8,
      accelerationZ: 4,
      gyroscopeX: 3,
      gyroscopeY: 2,
      gyroscopeZ: 1,
    });

    const result = analyzeReading(current, null);

    expect(result.isAccident).toBe(true);
  });

  test('confidence score is always between 0 and 1', () => {
    const current = baseReading({
      accelerationX: -20,
      accelerationY: 15,
      accelerationZ: 10,
      gyroscopeX: 900,
      gyroscopeY: 900,
      gyroscopeZ: 900,
    });

    const result = analyzeReading(current, null);

    expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(result.confidenceScore).toBeLessThanOrEqual(1);
  });
});
