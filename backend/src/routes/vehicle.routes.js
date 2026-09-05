/**
 * backend/src/routes/vehicle.routes.js
 *
 * Routes for vehicle management (req #1). All routes require
 * authentication; mutating routes (create/update/delete) are
 * restricted to ADMIN.
 */

const express = require('express');
const vehicleController = require('../controllers/vehicle.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createVehicleValidator,
  updateVehicleValidator,
  vehicleIdParamValidator,
} = require('../utils/validators');

const router = express.Router();

router.use(requireAuth);

router.post('/', requireRole('ADMIN'), createVehicleValidator, validate, vehicleController.createVehicle);
router.get('/', vehicleController.listVehicles);
router.get('/:id', vehicleIdParamValidator, validate, vehicleController.getVehicle);
router.get('/:id/sensor-readings', vehicleIdParamValidator, validate, vehicleController.getVehicleSensorReadings);
router.put('/:id', requireRole('ADMIN'), updateVehicleValidator, validate, vehicleController.updateVehicle);
router.delete('/:id', requireRole('ADMIN'), vehicleIdParamValidator, validate, vehicleController.deleteVehicle);

module.exports = router;
