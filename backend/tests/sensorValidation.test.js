/**
 * backend/tests/sensorValidation.test.js
 *
 * Unit tests for the sensorDataValidator rules (req #22), verifying
 * malformed/out-of-range sensor payloads are rejected with 400 and
 * valid payloads pass through to the handler.
 */

const express = require('express');
const request = require('supertest');
const validate = require('../src/middleware/validate.middleware');
const { sensorDataValidator } = require('../src/utils/validators');

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.post('/test-sensor-data', sensorDataValidator, validate, (req, res) => {
    res.status(200).json({ success: true, message: 'Validation passed' });
  });
  return app;
}

function validPayload(overrides = {}) {
  return {
    vehicleId: '123e4567-e89b-12d3-a456-426614174000',
    speed: 45,
    accelerationX: 0.1,
    accelerationY: 0.1,
    accelerationZ: 0.98,
    gyroscopeX: 2,
    gyroscopeY: 1,
    gyroscopeZ: 1,
    latitude: 12.9716,
    longitude: 77.5946,
    source: 'SIMULATION',
    ...overrides,
  };
}

describe('sensorDataValidator', () => {
  const app = buildTestApp();

  test('accepts a fully valid sensor payload', async () => {
    const res = await request(app).post('/test-sensor-data').send(validPayload());
    expect(res.status).toBe(200);
  });

  test('rejects payload with missing vehicleId', async () => {
    const payload = validPayload();
    delete payload.vehicleId;
    const res = await request(app).post('/test-sensor-data').send(payload);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects payload with non-UUID vehicleId', async () => {
    const res = await request(app)
      .post('/test-sensor-data')
      .send(validPayload({ vehicleId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  test('rejects speed outside realistic range', async () => {
    const res = await request(app)
      .post('/test-sensor-data')
      .send(validPayload({ speed: 1000 }));
    expect(res.status).toBe(400);
  });

  test('rejects negative speed', async () => {
    const res = await request(app)
      .post('/test-sensor-data')
      .send(validPayload({ speed: -10 }));
    expect(res.status).toBe(400);
  });

  test('rejects latitude outside valid range', async () => {
    const res = await request(app)
      .post('/test-sensor-data')
      .send(validPayload({ latitude: 200 }));
    expect(res.status).toBe(400);
  });

  test('accepts payload with missing GPS (optional fields)', async () => {
    const payload = validPayload();
    delete payload.latitude;
    delete payload.longitude;
    const res = await request(app).post('/test-sensor-data').send(payload);
    expect(res.status).toBe(200);
  });

  test('rejects invalid source enum value', async () => {
    const res = await request(app)
      .post('/test-sensor-data')
      .send(validPayload({ source: 'UNKNOWN_SOURCE' }));
    expect(res.status).toBe(400);
  });

  test('rejects acceleration values outside realistic bounds', async () => {
    const res = await request(app)
      .post('/test-sensor-data')
      .send(validPayload({ accelerationX: 999 }));
    expect(res.status).toBe(400);
  });
});
