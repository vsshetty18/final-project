/**
 * backend/src/services/simulation.service.js
 *
 * LIVE VEHICLE SIMULATION ENGINE (req #11).
 *
 * This is the PRIMARY DEMONSTRATION MECHANISM when no physical
 * hardware (ESP32 + MPU6050/9250 + GPS) is connected. It generates a
 * realistic short SEQUENCE of sensor readings for a chosen scenario
 * and feeds each one through the exact same
 * `accidentService.processSensorReading()` pipeline that a real
 * ESP32 would use via POST /api/sensor-data — there is NO separate
 * "fake" detection path. This is what makes the prototype
 * hardware-ready: swapping the simulator for real hardware later
 * requires zero changes to accident detection, geo lookup, or
 * notification logic.
 *
 * SCENARIOS:
 *   - NORMAL: steady city driving, no anomalies.
 *   - SUDDEN_BRAKING: hard brake, high deceleration, but NOT
 *     accompanied by abnormal rotation — by design this should NOT
 *     trigger an accident (demonstrates why we don't rely on speed/
 *     deceleration alone, and shows the rule engine correctly
 *     avoiding a false positive).
 *   - MINOR_COLLISION: moderate impact acceleration + rotation —
 *     triggers detection at MINOR/MODERATE severity.
 *   - SEVERE_COLLISION: extreme acceleration + rotation + hard
 *     deceleration — triggers detection at SEVERE/CRITICAL severity.
 */

const accidentService = require('./accident.service');
const logger = require('../config/logger');

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function isoOffset(baseMs, offsetMs) {
  return new Date(baseMs + offsetMs).toISOString();
}

/**
 * Build a sequence of sensor readings for a given scenario, ending
 * "now". Earlier readings establish a normal-driving baseline so the
 * rolling buffer has meaningful "before impact" context.
 *
 * @param {string} scenario
 * @param {{latitude:number, longitude:number}} location
 * @returns {Array<object>} ordered readings (oldest first)
 */
function buildScenarioReadings(scenario, location) {
  const now = Date.now();
  const baseLat = location?.latitude ?? 12.9716;
  const baseLng = location?.longitude ?? 77.5946;

  // Three baseline "normal driving" readings, 1 second apart, leading
  // up to the scenario event.
  const baseline = [-3000, -2000, -1000].map((offsetMs) => ({
    timestamp: isoOffset(now, offsetMs),
    speed: randomInRange(35, 55),
    accelerationX: randomInRange(-0.2, 0.2),
    accelerationY: randomInRange(-0.2, 0.2),
    accelerationZ: 0.98 + randomInRange(-0.03, 0.03),
    gyroscopeX: randomInRange(-4, 4),
    gyroscopeY: randomInRange(-4, 4),
    gyroscopeZ: randomInRange(-4, 4),
    latitude: baseLat + randomInRange(-0.0005, 0.0005),
    longitude: baseLng + randomInRange(-0.0005, 0.0005),
    source: 'SIMULATION',
  }));

  let eventReading;
  let afterReadings;

  switch (scenario) {
    case 'NORMAL': {
      // Just continue normal driving — no event reading, no accident.
      eventReading = {
        timestamp: isoOffset(now, 0),
        speed: randomInRange(35, 55),
        accelerationX: randomInRange(-0.2, 0.2),
        accelerationY: randomInRange(-0.2, 0.2),
        accelerationZ: 0.98 + randomInRange(-0.03, 0.03),
        gyroscopeX: randomInRange(-4, 4),
        gyroscopeY: randomInRange(-4, 4),
        gyroscopeZ: randomInRange(-4, 4),
        latitude: baseLat,
        longitude: baseLng,
        source: 'SIMULATION',
      };
      afterReadings = [];
      break;
    }

    case 'SUDDEN_BRAKING': {
      // High deceleration only — no abnormal rotation, and
      // acceleration spike stays below the "extreme" cutoff. Should
      // NOT be classified as an accident by the rule engine.
      eventReading = {
        timestamp: isoOffset(now, 0),
        speed: randomInRange(5, 15), // sharp drop from baseline ~45
        accelerationX: -randomInRange(3.5, 4.2), // near/at deceleration threshold
        accelerationY: randomInRange(-0.3, 0.3),
        accelerationZ: 1.0,
        gyroscopeX: randomInRange(-8, 8), // stays well below abnormal threshold
        gyroscopeY: randomInRange(-8, 8),
        gyroscopeZ: randomInRange(-8, 8),
        latitude: baseLat,
        longitude: baseLng,
        source: 'SIMULATION',
      };
      afterReadings = [
        {
          timestamp: isoOffset(now, 1000),
          speed: randomInRange(0, 8),
          accelerationX: randomInRange(-0.2, 0.2),
          accelerationY: randomInRange(-0.2, 0.2),
          accelerationZ: 0.98,
          gyroscopeX: randomInRange(-3, 3),
          gyroscopeY: randomInRange(-3, 3),
          gyroscopeZ: randomInRange(-3, 3),
          latitude: baseLat,
          longitude: baseLng,
          source: 'SIMULATION',
        },
      ];
      break;
    }

    case 'MINOR_COLLISION': {
      eventReading = {
        timestamp: isoOffset(now, 0),
        speed: randomInRange(10, 20),
        accelerationX: -randomInRange(4.5, 5.5),
        accelerationY: randomInRange(1.5, 3),
        accelerationZ: randomInRange(1.5, 2.5),
        gyroscopeX: randomInRange(260, 320),
        gyroscopeY: randomInRange(-150, 150),
        gyroscopeZ: randomInRange(-150, 150),
        latitude: baseLat,
        longitude: baseLng,
        source: 'SIMULATION',
      };
      afterReadings = [
        {
          timestamp: isoOffset(now, 1500),
          speed: randomInRange(0, 8),
          accelerationX: randomInRange(-0.3, 0.3),
          accelerationY: randomInRange(-0.3, 0.3),
          accelerationZ: 0.97,
          gyroscopeX: randomInRange(-5, 5),
          gyroscopeY: randomInRange(-5, 5),
          gyroscopeZ: randomInRange(-5, 5),
          latitude: baseLat,
          longitude: baseLng,
          source: 'SIMULATION',
        },
      ];
      break;
    }

    case 'SEVERE_COLLISION':
    default: {
      eventReading = {
        timestamp: isoOffset(now, 0),
        speed: randomInRange(3, 10),
        accelerationX: -randomInRange(7, 9),
        accelerationY: randomInRange(4, 6),
        accelerationZ: randomInRange(3, 4.5),
        gyroscopeX: randomInRange(300, 400),
        gyroscopeY: randomInRange(-350, 350),
        gyroscopeZ: randomInRange(-300, 300),
        latitude: baseLat,
        longitude: baseLng,
        source: 'SIMULATION',
      };
      afterReadings = [
        {
          timestamp: isoOffset(now, 2000),
          speed: 0,
          accelerationX: randomInRange(-0.2, 0.2),
          accelerationY: randomInRange(-0.2, 0.2),
          accelerationZ: 0.95,
          gyroscopeX: randomInRange(-5, 5),
          gyroscopeY: randomInRange(-5, 5),
          gyroscopeZ: randomInRange(-5, 5),
          latitude: baseLat,
          longitude: baseLng,
          source: 'SIMULATION',
        },
      ];
      break;
    }
  }

  return [...baseline, eventReading, ...afterReadings];
}

/**
 * Run a full simulation scenario for a vehicle: builds the reading
 * sequence and feeds each reading, in order, through the REAL
 * accident detection pipeline (accidentService.processSensorReading).
 *
 * @param {{vehicleId:string, scenario:string, latitude?:number, longitude?:number}} params
 * @returns {Promise<{readingsProcessed:number, results:Array<object>, finalResult:object}>}
 */
async function runScenario({ vehicleId, scenario, latitude, longitude }) {
  const readings = buildScenarioReadings(scenario, { latitude, longitude });

  const results = [];
  for (const reading of readings) {
    // Sequential await is intentional: each reading must be persisted
    // and buffered before the next is analyzed, so "before impact"
    // context is correctly established — exactly as would happen
    // with real hardware streaming data over time.
    // eslint-disable-next-line no-await-in-loop
    const result = await accidentService.processSensorReading({
      vehicleId,
      ...reading,
    });
    results.push(result);
  }

  const finalResult = results[results.length - 1];

  logger.info('Simulation scenario completed', {
    vehicleId,
    scenario,
    readingsProcessed: results.length,
    accidentCreated: Boolean(finalResult.accident),
  });

  return {
    readingsProcessed: results.length,
    results,
    finalResult,
  };
}

module.exports = {
  runScenario,
  buildScenarioReadings,
};
