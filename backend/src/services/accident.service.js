/**
 * backend/src/services/accident.service.js
 *
 * THE CORE ORCHESTRATOR of the entire system.
 *
 * This is where a raw sensor reading becomes, if warranted, a fully
 * recorded Accident with:
 *   - speed before / at / after impact (req #4)
 *   - nearest police station + hospital (req #6, #7)
 *   - emergency notifications (req #8)
 *   - duplicate-accident prevention via cooldown (req #17)
 *
 * FLOW for every incoming sensor reading:
 *   1. Persist the raw SensorReading (always — no data is ever lost).
 *   2. Push it into the vehicle's in-memory rolling buffer.
 *   3. Run accidentDetection.service.analyzeReading() against it,
 *      comparing with the previous buffered reading.
 *   4. If flagged as an accident AND the vehicle is not in a
 *      cooldown window since its last recorded accident:
 *        a. Extract speed before/at/after impact from the buffer.
 *        b. Look up nearest police station + hospital.
 *        c. Persist the Accident + AccidentSensorSnapshot rows.
 *        d. Dispatch notifications (best-effort, never blocks #c).
 *   5. If in cooldown, log and skip creating a duplicate accident.
 */

const prisma = require('../config/prisma');
const logger = require('../config/logger');
const { THRESHOLDS } = require('../constants/thresholds');
const sensorBuffer = require('./sensorBuffer.service');
const { analyzeReading } = require('./accidentDetection.service');
const geoLookup = require('./geoLookup.service');
const { sendAccidentNotifications } = require('./notification/notification.service');

/**
 * Determine whether a vehicle is currently within its accident
 * cooldown window (req #17 — duplicate accident prevention).
 * @param {string} vehicleId
 * @returns {Promise<boolean>}
 */
async function isInCooldown(vehicleId) {
  const lastAccident = await prisma.accident.findFirst({
    where: { vehicleId },
    orderBy: { occurredAt: 'desc' },
  });

  if (!lastAccident) return false;

  const cooldownMs = THRESHOLDS.COOLDOWN_SECONDS * 1000;
  const elapsedMs = Date.now() - new Date(lastAccident.occurredAt).getTime();

  return elapsedMs < cooldownMs;
}

/**
 * Persist the raw sensor reading unconditionally, then feed it into
 * the detection pipeline.
 *
 * @param {object} sensorInput - validated request body from
 *   POST /api/sensor-data (works identically for simulation and
 *   real ESP32 hardware — req #12 hardware-ready endpoint).
 * @returns {Promise<{
 *   sensorReading: object,
 *   detection: object,
 *   accident: object|null,
 *   notifications: object|null
 * }>}
 */
async function processSensorReading(sensorInput) {
  const {
    vehicleId,
    timestamp,
    speed,
    accelerationX,
    accelerationY,
    accelerationZ,
    gyroscopeX,
    gyroscopeY,
    gyroscopeZ,
    latitude,
    longitude,
    source,
  } = sensorInput;

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    const err = new Error('Invalid vehicle ID — vehicle not found');
    err.statusCode = 404;
    throw err;
  }

  const readingTimestamp = timestamp ? new Date(timestamp) : new Date();

  // 1. Always persist the raw reading first — no data is ever lost,
  //    even if the vehicle is missing GPS or the accident pipeline
  //    later fails.
  const sensorReading = await prisma.sensorReading.create({
    data: {
      vehicleId,
      timestamp: readingTimestamp,
      speed,
      accelerationX,
      accelerationY,
      accelerationZ,
      gyroscopeX,
      gyroscopeY,
      gyroscopeZ,
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
      source: source || 'SIMULATION',
    },
  });

  // 2. Capture the "before" reading BEFORE pushing the new one in,
  //    so we compare against the true prior state.
  const previousReading = sensorBuffer.getBuffer(vehicleId).slice(-1)[0] || null;

  // 3. Now push the new reading into the rolling buffer.
  sensorBuffer.pushReading(vehicleId, sensorReading);

  // 4. Run detection.
  const detection = analyzeReading(sensorReading, previousReading);

  if (!detection.isAccident) {
    return { sensorReading, detection, accident: null, notifications: null };
  }

  // 5. Duplicate prevention.
  const cooling = await isInCooldown(vehicleId);
  if (cooling) {
    logger.info('Possible accident detected but vehicle is in cooldown — skipping duplicate record', {
      vehicleId,
      confidenceScore: detection.confidenceScore,
    });
    return { sensorReading, detection, accident: null, notifications: null };
  }

  // 6. Build the full accident record.
  const accident = await createAccidentRecord({ vehicle, sensorReading, detection });

  // 7. Dispatch notifications (best-effort — never throws, accident
  //    record above is already safely persisted regardless).
  let notifications = null;
  try {
    notifications = await sendAccidentNotifications({
      accident: accident.accident,
      vehicle,
      policeStation: accident.policeStation,
      hospital: accident.hospital,
    });

    await prisma.accident.update({
      where: { id: accident.accident.id },
      data: { status: 'NOTIFIED' },
    });
  } catch (err) {
    // sendAccidentNotifications is designed to never throw, but we
    // guard here anyway per requirement #16 (graceful error handling).
    logger.error('Unexpected error while dispatching accident notifications', {
      accidentId: accident.accident.id,
      error: err.message,
    });
  }

  return {
    sensorReading,
    detection,
    accident: accident.accident,
    notifications,
  };
}

/**
 * Build and persist the full Accident record: speed timeline, geo
 * lookups, and sensor snapshots.
 * @param {{vehicle:object, sensorReading:object, detection:object}} params
 * @returns {Promise<{accident:object, policeStation:object|null, hospital:object|null}>}
 */
async function createAccidentRecord({ vehicle, sensorReading, detection }) {
  const timeline = sensorBuffer.getAccidentTimeline(vehicle.id, sensorReading);
  const beforeReading = timeline.before.length > 0 ? timeline.before[timeline.before.length - 1] : null;
  const afterReading = timeline.after.length > 0 ? timeline.after[0] : null;

  const latitude = sensorReading.latitude ?? beforeReading?.latitude ?? null;
  const longitude = sensorReading.longitude ?? beforeReading?.longitude ?? null;

  if (latitude === null || longitude === null) {
    logger.warn('Accident detected without valid GPS coordinates — geo lookup will be skipped', {
      vehicleId: vehicle.id,
    });
  }

  // Geo lookup (req #6, #7) — gracefully handle unavailable lookup.
  let policeStation = null;
  let hospital = null;
  if (latitude !== null && longitude !== null) {
    try {
      [policeStation, hospital] = await Promise.all([
        geoLookup.findNearestPoliceStation({ latitude, longitude }),
        geoLookup.findNearestHospital({ latitude, longitude }),
      ]);
    } catch (err) {
      logger.error('Geo lookup failed — accident will still be recorded without station/hospital', {
        error: err.message,
      });
    }
  }

  const accident = await prisma.accident.create({
    data: {
      vehicleId: vehicle.id,
      occurredAt: sensorReading.timestamp,
      latitude: latitude ?? 0,
      longitude: longitude ?? 0,
      speedBeforeImpact: beforeReading ? beforeReading.speed : sensorReading.speed,
      impactSpeed: sensorReading.speed,
      speedAfterImpact: afterReading ? afterReading.speed : null,
      peakAccelerationX: sensorReading.accelerationX,
      peakAccelerationY: sensorReading.accelerationY,
      peakAccelerationZ: sensorReading.accelerationZ,
      peakGyroX: sensorReading.gyroscopeX,
      peakGyroY: sensorReading.gyroscopeY,
      peakGyroZ: sensorReading.gyroscopeZ,
      severity: detection.severity,
      confidenceScore: detection.confidenceScore,
      source: sensorReading.source,
      status: 'DETECTED',
      nearestPoliceStationId: policeStation ? policeStation.id : null,
      policeDistanceKm: policeStation ? policeStation.distanceKm : null,
      nearestHospitalId: hospital ? hospital.id : null,
      hospitalDistanceKm: hospital ? hospital.distanceKm : null,
    },
  });

  // Persist sensor snapshots (before/impact/after) for the timeline UI.
  const snapshotData = [];
  if (beforeReading) {
    snapshotData.push({
      accidentId: accident.id,
      sensorReadingId: beforeReading.id,
      relativePosition: 'BEFORE',
      offsetMs: new Date(beforeReading.timestamp).getTime() - new Date(sensorReading.timestamp).getTime(),
    });
  }
  snapshotData.push({
    accidentId: accident.id,
    sensorReadingId: sensorReading.id,
    relativePosition: 'IMPACT',
    offsetMs: 0,
  });
  if (afterReading) {
    snapshotData.push({
      accidentId: accident.id,
      sensorReadingId: afterReading.id,
      relativePosition: 'AFTER',
      offsetMs: new Date(afterReading.timestamp).getTime() - new Date(sensorReading.timestamp).getTime(),
    });
  }

  if (snapshotData.length > 0) {
    await prisma.accidentSensorSnapshot.createMany({ data: snapshotData });
  }

  logger.info('Accident record created', {
    accidentId: accident.id,
    vehicleId: vehicle.id,
    severity: accident.severity,
    confidenceScore: accident.confidenceScore,
  });

  return { accident, policeStation, hospital };
}

/**
 * List accidents with filters + pagination (dashboard/accidents page).
 * @param {object} filters
 */
async function listAccidents({
  page = 1,
  limit = 20,
  severity,
  status,
  vehicleId,
  from,
  to,
} = {}) {
  const where = {};
  if (severity) where.severity = severity;
  if (status) where.status = status;
  if (vehicleId) where.vehicleId = vehicleId;
  if (from || to) {
    where.occurredAt = {};
    if (from) where.occurredAt.gte = new Date(from);
    if (to) where.occurredAt.lte = new Date(to);
  }

  const [accidents, total] = await Promise.all([
    prisma.accident.findMany({
      where,
      include: {
        vehicle: true,
        nearestPoliceStation: true,
        nearestHospital: true,
        notifications: true,
      },
      orderBy: { occurredAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.accident.count({ where }),
  ]);

  return {
    accidents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Full accident detail, including sensor snapshot timeline.
 * @param {string} id
 */
async function getAccidentById(id) {
  const accident = await prisma.accident.findUnique({
    where: { id },
    include: {
      vehicle: true,
      nearestPoliceStation: true,
      nearestHospital: true,
      notifications: true,
      sensorSnapshots: {
        include: { sensorReading: true },
        orderBy: { offsetMs: 'asc' },
      },
    },
  });

  return accident;
}

/**
 * @param {string} id
 * @param {string} status
 */
async function updateAccidentStatus(id, status) {
  return prisma.accident.update({
    where: { id },
    data: { status },
  });
}

module.exports = {
  processSensorReading,
  createAccidentRecord,
  listAccidents,
  getAccidentById,
  updateAccidentStatus,
  isInCooldown,
};
