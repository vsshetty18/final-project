/**
 * backend/tests/accidentCreation.test.js
 *
 * Integration-style unit tests for accident.service.js's
 * createAccidentRecord() — verifying it correctly assembles speed
 * timeline, geo lookup results, and sensor snapshots into a
 * persisted Accident record (req #22).
 *
 * Prisma and geoLookup.service are mocked; sensorBuffer.service runs
 * for real so the before/impact/after extraction logic is genuinely
 * exercised.
 */

jest.mock('../src/config/prisma', () => ({
  accident: {
    create: jest.fn(),
  },
  accidentSensorSnapshot: {
    createMany: jest.fn().mockResolvedValue({ count: 3 }),
  },
}));

jest.mock('../src/services/geoLookup.service', () => ({
  findNearestPoliceStation: jest.fn(),
  findNearestHospital: jest.fn(),
}));

const prisma = require('../src/config/prisma');
const geoLookup = require('../src/services/geoLookup.service');
const sensorBuffer = require('../src/services/sensorBuffer.service');
const { createAccidentRecord } = require('../src/services/accident.service');

function reading(id, speed, offsetMs, coords = {}) {
  return {
    id,
    timestamp: new Date(Date.now() + offsetMs).toISOString(),
    speed,
    accelerationX: -8,
    accelerationY: 5,
    accelerationZ: 3,
    gyroscopeX: 300,
    gyroscopeY: -280,
    gyroscopeZ: 260,
    latitude: coords.latitude ?? 12.95,
    longitude: coords.longitude ?? 77.61,
  };
}

describe('accident.service - createAccidentRecord', () => {
  const vehicle = { id: 'vehicle-1', registrationNumber: 'KA-01-AB-1234' };

  beforeEach(() => {
    sensorBuffer.clearAllBuffers();
    jest.clearAllMocks();

    prisma.accident.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'accident-1', ...data })
    );

    geoLookup.findNearestPoliceStation.mockResolvedValue({
      id: 'station-1',
      name: 'Test Police Station',
      distanceKm: 1.5,
    });
    geoLookup.findNearestHospital.mockResolvedValue({
      id: 'hospital-1',
      name: 'Test Hospital',
      distanceKm: 0.8,
    });
  });

  test('extracts speed before/at/after impact correctly and persists the accident', async () => {
    const beforeReading = reading('r1', 50, -2000);
    const afterReading = reading('r2', 0, 2000);
    sensorBuffer.pushReading(vehicle.id, beforeReading);

    const impactReading = reading('impact-1', 6, 0);
    sensorBuffer.pushReading(vehicle.id, impactReading);
    sensorBuffer.pushReading(vehicle.id, afterReading);

    const detection = { severity: 'SEVERE', confidenceScore: 0.87 };

    const result = await createAccidentRecord({
      vehicle,
      sensorReading: impactReading,
      detection,
    });

    expect(prisma.accident.create).toHaveBeenCalledTimes(1);
    const createArgs = prisma.accident.create.mock.calls[0][0].data;

    expect(createArgs.speedBeforeImpact).toBe(50);
    expect(createArgs.impactSpeed).toBe(6);
    expect(createArgs.speedAfterImpact).toBe(0);
    expect(createArgs.severity).toBe('SEVERE');
    expect(createArgs.nearestPoliceStationId).toBe('station-1');
    expect(createArgs.policeDistanceKm).toBe(1.5);
    expect(createArgs.nearestHospitalId).toBe('hospital-1');
    expect(createArgs.hospitalDistanceKm).toBe(0.8);

    expect(result.accident.id).toBe('accident-1');
    expect(result.policeStation.name).toBe('Test Police Station');
    expect(result.hospital.name).toBe('Test Hospital');
  });

  test('creates AccidentSensorSnapshot rows for available before/impact/after readings', async () => {
    const beforeReading = reading('r1', 50, -2000);
    sensorBuffer.pushReading(vehicle.id, beforeReading);
    const impactReading = reading('impact-2', 6, 0);
    sensorBuffer.pushReading(vehicle.id, impactReading);

    await createAccidentRecord({
      vehicle,
      sensorReading: impactReading,
      detection: { severity: 'MODERATE', confidenceScore: 0.7 },
    });

    expect(prisma.accidentSensorSnapshot.createMany).toHaveBeenCalledTimes(1);
    const snapshotData = prisma.accidentSensorSnapshot.createMany.mock.calls[0][0].data;
    const positions = snapshotData.map((s) => s.relativePosition);

    expect(positions).toContain('BEFORE');
    expect(positions).toContain('IMPACT');
  });

  test('falls back gracefully when geo lookup returns no results', async () => {
    geoLookup.findNearestPoliceStation.mockResolvedValue(null);
    geoLookup.findNearestHospital.mockResolvedValue(null);

    const impactReading = reading('impact-3', 6, 0);
    sensorBuffer.pushReading(vehicle.id, impactReading);

    const result = await createAccidentRecord({
      vehicle,
      sensorReading: impactReading,
      detection: { severity: 'CRITICAL', confidenceScore: 0.9 },
    });

    const createArgs = prisma.accident.create.mock.calls[0][0].data;
    expect(createArgs.nearestPoliceStationId).toBeNull();
    expect(createArgs.nearestHospitalId).toBeNull();
    expect(result.policeStation).toBeNull();
    expect(result.hospital).toBeNull();
  });
});
