/**
 * backend/src/utils/validators.js
 *
 * Reusable express-validator chains for every endpoint that accepts
 * user or sensor input. Kept in one file so validation rules are
 * easy to audit and reuse across routes.
 */

const { body, param, query } = require('express-validator');

// ---------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------
const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('role').optional().isIn(['ADMIN', 'OPERATOR']).withMessage('Invalid role'),
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// ---------------------------------------------------------------------
// VEHICLE
// ---------------------------------------------------------------------
const createVehicleValidator = [
  body('registrationNumber').trim().notEmpty().withMessage('Registration number is required'),
  body('model').trim().notEmpty().withMessage('Vehicle model is required'),
  body('ownerName').trim().notEmpty().withMessage('Owner name is required'),
  body('ownerPhone')
    .trim()
    .notEmpty()
    .withMessage('Owner phone number is required')
    .isLength({ min: 7, max: 20 })
    .withMessage('Owner phone number looks invalid'),
  body('deviceId').optional({ nullable: true }).isString(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE']),
];

const updateVehicleValidator = [
  param('id').isUUID().withMessage('Invalid vehicle id'),
  body('registrationNumber').optional().trim().notEmpty(),
  body('model').optional().trim().notEmpty(),
  body('ownerName').optional().trim().notEmpty(),
  body('ownerPhone').optional().trim().isLength({ min: 7, max: 20 }),
  body('deviceId').optional({ nullable: true }).isString(),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'MAINTENANCE']),
];

const vehicleIdParamValidator = [param('id').isUUID().withMessage('Invalid vehicle id')];

// ---------------------------------------------------------------------
// SENSOR DATA  (hardware-ready — same schema an ESP32 will POST)
// ---------------------------------------------------------------------
const sensorDataValidator = [
  body('vehicleId').isUUID().withMessage('vehicleId must be a valid UUID'),
  body('timestamp').optional().isISO8601().withMessage('timestamp must be a valid ISO8601 date'),
  body('speed').isFloat({ min: 0, max: 400 }).withMessage('speed must be a number between 0 and 400 km/h'),
  body('accelerationX').isFloat({ min: -50, max: 50 }).withMessage('accelerationX out of realistic range'),
  body('accelerationY').isFloat({ min: -50, max: 50 }).withMessage('accelerationY out of realistic range'),
  body('accelerationZ').isFloat({ min: -50, max: 50 }).withMessage('accelerationZ out of realistic range'),
  body('gyroscopeX').isFloat({ min: -2000, max: 2000 }).withMessage('gyroscopeX out of realistic range'),
  body('gyroscopeY').isFloat({ min: -2000, max: 2000 }).withMessage('gyroscopeY out of realistic range'),
  body('gyroscopeZ').isFloat({ min: -2000, max: 2000 }).withMessage('gyroscopeZ out of realistic range'),
  body('latitude').optional({ nullable: true }).isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90'),
  body('longitude').optional({ nullable: true }).isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180'),
  body('source').optional().isIn(['SIMULATION', 'HARDWARE']).withMessage('source must be SIMULATION or HARDWARE'),
];

// ---------------------------------------------------------------------
// ACCIDENT
// ---------------------------------------------------------------------
const accidentIdParamValidator = [param('id').isUUID().withMessage('Invalid accident id')];

const listAccidentsQueryValidator = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('severity').optional().isIn(['MINOR', 'MODERATE', 'SEVERE', 'CRITICAL']),
  query('status').optional().isIn(['DETECTED', 'NOTIFIED', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM']),
  query('vehicleId').optional().isUUID(),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
];

const updateAccidentStatusValidator = [
  param('id').isUUID().withMessage('Invalid accident id'),
  body('status')
    .isIn(['DETECTED', 'NOTIFIED', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM'])
    .withMessage('Invalid accident status'),
];

// ---------------------------------------------------------------------
// POLICE STATION / HOSPITAL (admin management, optional CRUD)
// ---------------------------------------------------------------------
const createStationValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('phone').optional().isString(),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('latitude must be between -90 and 90'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('longitude must be between -180 and 180'),
];

// ---------------------------------------------------------------------
// SIMULATION
// ---------------------------------------------------------------------
const simulationScenarioValidator = [
  body('vehicleId').isUUID().withMessage('vehicleId must be a valid UUID'),
  body('scenario')
    .isIn(['NORMAL', 'SUDDEN_BRAKING', 'MINOR_COLLISION', 'SEVERE_COLLISION'])
    .withMessage('scenario must be one of NORMAL, SUDDEN_BRAKING, MINOR_COLLISION, SEVERE_COLLISION'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
];

module.exports = {
  registerValidator,
  loginValidator,
  createVehicleValidator,
  updateVehicleValidator,
  vehicleIdParamValidator,
  sensorDataValidator,
  accidentIdParamValidator,
  listAccidentsQueryValidator,
  updateAccidentStatusValidator,
  createStationValidator,
  simulationScenarioValidator,
};
