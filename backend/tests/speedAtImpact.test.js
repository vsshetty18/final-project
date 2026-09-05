/**
 * backend/tests/speedAtImpact.test.js
 *
 * Unit tests for sensorBuffer.service.js — verifying the system
 * correctly preserves and extracts speed BEFORE, AT, and AFTER
 * impact rather than simply using the post-crash "current" speed
 * (req #4, tested per req #22).
 */

const sensorBuffer = require('../src/services/sensorBuffer.service');

function reading(speed, offsetMs) {
  return {
    timestamp: new Date(Date.now() + offsetMs).toISOString(),
    speed,
    accelerationX: 0,
    accelerationY: 0,
    accelerationZ: 1,
    gyroscopeX: 0,
    gyroscopeY: 0,
    gyroscopeZ: 0,
  };
}

describe('sensorBuffer.service - speed at impact extraction', () => {
  const vehicleId = 'test-vehicle-1';

  beforeEach(() => {
    sensorBuffer.clearAllBuffers();
  });

  test('getReadingBeforeImpact returns the reading immediately preceding the impact reading', () => {
    const r1 = reading(50, -3000);
    const r2 = reading(48, -2000);
    const r3 = reading(45, -1000); // this should be "before impact"
    const impact = reading(6, 0); // sudden drop = impact reading

    sensorBuffer.pushReading(vehicleId, r1);
    sensorBuffer.pushReading(vehicleId, r2);
    sensorBuffer.pushReading(vehicleId, r3);
    // Note: impact reading itself is NOT pushed yet when we look it up,
    // mirroring how accident.service.js captures "previous" before pushing.

    const before = sensorBuffer.getReadingBeforeImpact(vehicleId, impact);

    expect(before).not.toBeNull();
    expect(before.speed).toBe(45); // NOT the post-impact speed of 6
  });

  test('getAccidentTimeline correctly separates before/impact/after readings', () => {
    const r1 = reading(50, -2000);
    const r2 = reading(45, -1000);
    const impact = reading(5, 0);
    const after1 = reading(0, 1000);

    sensorBuffer.pushReading(vehicleId, r1);
    sensorBuffer.pushReading(vehicleId, r2);
    sensorBuffer.pushReading(vehicleId, impact);
    sensorBuffer.pushReading(vehicleId, after1);

    const timeline = sensorBuffer.getAccidentTimeline(vehicleId, impact);

    expect(timeline.before.length).toBe(2);
    expect(timeline.before[timeline.before.length - 1].speed).toBe(45);
    expect(timeline.impact.speed).toBe(5);
    expect(timeline.after.length).toBe(1);
    expect(timeline.after[0].speed).toBe(0);
  });

  test('buffer evicts readings older than the configured window', () => {
    const veryOld = reading(50, -60000); // 60s old — outside default 10s window
    const recent = reading(40, -1000);

    sensorBuffer.pushReading(vehicleId, veryOld);
    sensorBuffer.pushReading(vehicleId, recent);

    const buffer = sensorBuffer.getBuffer(vehicleId);
    const speeds = buffer.map((r) => r.speed);

    expect(speeds).not.toContain(50);
    expect(speeds).toContain(40);
  });

  test('different vehicles maintain independent buffers', () => {
    sensorBuffer.pushReading('vehicle-A', reading(30, 0));
    sensorBuffer.pushReading('vehicle-B', reading(60, 0));

    expect(sensorBuffer.getBuffer('vehicle-A').length).toBe(1);
    expect(sensorBuffer.getBuffer('vehicle-B').length).toBe(1);
    expect(sensorBuffer.getBuffer('vehicle-A')[0].speed).toBe(30);
    expect(sensorBuffer.getBuffer('vehicle-B')[0].speed).toBe(60);
  });
});
