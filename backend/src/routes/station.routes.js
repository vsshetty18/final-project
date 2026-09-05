/**
 * backend/src/routes/station.routes.js
 *
 * Routes for Police Stations and Hospitals (req #6, #7). Exports two
 * routers so app.js can mount them at distinct paths:
 *   /api/police-stations
 *   /api/hospitals
 *
 * Listing is available to any authenticated user (used by the
 * accident details map); creation is restricted to ADMIN.
 */

const express = require('express');
const stationController = require('../controllers/station.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createStationValidator } = require('../utils/validators');

const policeStationRouter = express.Router();
policeStationRouter.use(requireAuth);
policeStationRouter.get('/', stationController.listPoliceStations);
policeStationRouter.get('/:id', stationController.getPoliceStation);
policeStationRouter.post(
  '/',
  requireRole('ADMIN'),
  createStationValidator,
  validate,
  stationController.createPoliceStation
);

const hospitalRouter = express.Router();
hospitalRouter.use(requireAuth);
hospitalRouter.get('/', stationController.listHospitals);
hospitalRouter.get('/:id', stationController.getHospital);
hospitalRouter.post(
  '/',
  requireRole('ADMIN'),
  createStationValidator,
  validate,
  stationController.createHospital
);

module.exports = {
  policeStationRouter,
  hospitalRouter,
};
