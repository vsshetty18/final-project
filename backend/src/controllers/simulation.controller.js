/**
 * backend/src/controllers/simulation.controller.js
 *
 * HTTP layer for the live vehicle simulation engine (req #11).
 */

const simulationService = require('../services/simulation.service');
const { asyncHandler } = require('../middleware/error.middleware');
const { success } = require('../utils/apiResponse.util');

/**
 * POST /api/simulation/run
 *
 * Body: { vehicleId, scenario, latitude?, longitude? }
 * scenario: NORMAL | SUDDEN_BRAKING | MINOR_COLLISION | SEVERE_COLLISION
 */
const runSimulation = asyncHandler(async (req, res) => {
  const { vehicleId, scenario, latitude, longitude } = req.body;

  const result = await simulationService.runScenario({
    vehicleId,
    scenario,
    latitude,
    longitude,
  });

  const finalResult = result.finalResult;

  return success(res, {
    message: finalResult.accident
      ? `Simulation complete — ${scenario} scenario triggered an accident record`
      : `Simulation complete — ${scenario} scenario did not trigger an accident`,
    data: {
      readingsProcessed: result.readingsProcessed,
      detection: {
        isAccident: finalResult.detection.isAccident,
        confidenceScore: finalResult.detection.confidenceScore,
        severity: finalResult.detection.severity,
        reasons: finalResult.detection.reasons,
      },
      accident: finalResult.accident,
      notifications: finalResult.notifications,
    },
  });
});

module.exports = {
  runSimulation,
};
