/**
 * backend/src/routes/sensor.routes.js
 *
 * Routes for sensor data ingestion (req #2, #12).
 *
 * ---------------------------------------------------------------
 * SECURITY NOTE (explainable during viva):
 * ---------------------------------------------------------------
 * This endpoint is intentionally NOT behind interactive JWT
 * authentication, because a real ESP32/Arduino device cannot perform
 * a username/password login flow. Instead it is protected by:
 *   - a dedicated, more permissive rate limiter (sensorDataLimiter)
 *     tuned for frequent device telemetry,
 *   - strict input validation (sensorDataValidator) rejecting
 *     out-of-range or malformed values,
 *   - a vehicleId FK check inside accident.service.js that rejects
 *     unknown vehicles.
 *
 * FUTURE HARDENING (documented in docs/hardware-integration.md):
 * a per-device API key/shared-secret header (e.g. X-Device-Key)
 * could be added and checked against Vehicle.deviceId before
 * accepting data, without changing this route's shape.
 * ---------------------------------------------------------------
 */

const express = require('express');
const sensorController = require('../controllers/sensor.controller');
const { sensorDataLimiter } = require('../middleware/rateLimit.middleware');
const validate = require('../middleware/validate.middleware');
const { sensorDataValidator } = require('../utils/validators');

const router = express.Router();

router.post('/', sensorDataLimiter, sensorDataValidator, validate, sensorController.submitSensorData);

module.exports = router;
