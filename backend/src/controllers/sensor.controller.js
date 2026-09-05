/**
 * backend/src/controllers/sensor.controller.js
 *
 * HTTP layer for the hardware-ready sensor data ingestion endpoint
 * (req #2, #12). This is the SAME endpoint a real ESP32 + MPU6050/
 * MPU9250 + GPS module would POST to — the simulator uses it
 * internally via simulation.service.js, and no code changes are
 * needed to support real hardware later.
 */

const accidentService = require('../services/accident.service');
const { asyncHandler } = require('../middleware/error.middleware');
const { success, created } = require('../utils/apiResponse.util');

/**
 * POST /api/sensor-data
 *
 * Body:
 * {
 *   vehicleId, timestamp?, speed,
 *   accelerationX, accelerationY, accelerationZ,
 *   gyroscopeX, gyroscopeY, gyroscopeZ,
 *   latitude?, longitude?, source?
 * }
 */
const submitSensorData = asyncHandler(async (req, res) => {
  const result = await accidentService.processSensorReading(req.body);

  const message = result.accident
    ? 'Sensor data processed — accident detected and recorded'
    : 'Sensor data processed successfully';

  return created(res, {
    message,
    data: {
      sensorReadingId: result.sensorReading.id,
      detection: {
        isAccident: result.detection.isAccident,
        confidenceScore: result.detection.confidenceScore,
        severity: result.detection.severity,
        reasons: result.detection.reasons,
      },
      accident: result.accident,
      notifications: result.notifications,
    },
  });
});

module.exports = {
  submitSensorData,
};
