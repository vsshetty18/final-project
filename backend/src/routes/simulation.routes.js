/**
 * backend/src/routes/simulation.routes.js
 *
 * Routes for the live vehicle simulation engine (req #11). Requires
 * authentication since this is an operator-driven dashboard feature,
 * not a hardware-facing endpoint (unlike /api/sensor-data).
 */

const express = require('express');
const simulationController = require('../controllers/simulation.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { simulationScenarioValidator } = require('../utils/validators');

const router = express.Router();

router.use(requireAuth);

router.post('/run', simulationScenarioValidator, validate, simulationController.runSimulation);

module.exports = router;
