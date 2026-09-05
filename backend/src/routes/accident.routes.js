/**
 * backend/src/routes/accident.routes.js
 *
 * Routes for accident records (req #9, #10). All routes require
 * authentication.
 */

const express = require('express');
const accidentController = require('../controllers/accident.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  accidentIdParamValidator,
  listAccidentsQueryValidator,
  updateAccidentStatusValidator,
} = require('../utils/validators');

const router = express.Router();

router.use(requireAuth);

router.get('/', listAccidentsQueryValidator, validate, accidentController.listAccidents);
router.get('/:id', accidentIdParamValidator, validate, accidentController.getAccident);
router.patch('/:id/status', updateAccidentStatusValidator, validate, accidentController.updateAccidentStatus);

module.exports = router;
