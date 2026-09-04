/**
 * backend/src/services/notification/notification.service.js
 *
 * NotificationService — orchestrates emergency notifications to the
 * nearest police station and hospital when an accident is confirmed.
 *
 * ---------------------------------------------------------------
 * DESIGN (explainable during viva):
 * ---------------------------------------------------------------
 * This is a provider abstraction. `NOTIFICATION_MODE` env var selects
 * the active channel:
 *   - "console" (default): safe, dependency-free demo mode. Prints
 *     the formatted alert to the server console/log and marks the
 *     Notification row as SENT. Always works, no external service
 *     required — ideal for the viva demo.
 *   - "email": sends a real email via SMTP (nodemailer) if SMTP_*
 *     env vars are configured.
 *   - SMS is available as an additional, optional channel
 *     (SMS_ENABLED=true) layered on top of whichever primary mode is
 *     active, via a Twilio-shaped provider stub.
 *
 * CRITICAL REQUIREMENT: if the external notification channel fails
 * (e.g. SMTP misconfigured, network down), the accident record must
 * still be saved. This service therefore NEVER throws for a delivery
 * failure — it catches, logs, and marks the Notification row FAILED
 * instead. The caller (accident.service.js) always persists the
 * Accident row first, independent of notification outcome.
 * ---------------------------------------------------------------
 */

const prisma = require('../../config/prisma');
const env = require('../../config/env');
const logger = require('../../config/logger');
const consoleProvider = require('./console.provider');
const emailProvider = require('./email.provider');
const smsProvider = require('./sms.provider');

/**
 * Build the standardized "ACCIDENT ALERT" message body (req #8 format).
 * @param {object} params
 * @returns {string}
 */
function buildAlertMessage({
  accident,
  vehicle,
  policeStation,
  hospital,
}) {
  const dateObj = new Date(accident.occurredAt);
  const dateStr = dateObj.toLocaleDateString('en-IN');
  const timeStr = dateObj.toLocaleTimeString('en-IN');

  return [
    'ACCIDENT ALERT',
    '',
    `Vehicle ID: ${vehicle.id}`,
    `Vehicle registration: ${vehicle.registrationNumber}`,
    `Date: ${dateStr}`,
    `Time: ${timeStr}`,
    `Location: ${accident.latitude}, ${accident.longitude}`,
    `Latitude: ${accident.latitude}`,
    `Longitude: ${accident.longitude}`,
    `Speed before impact: ${accident.speedBeforeImpact} km/h`,
    `Impact speed: ${accident.impactSpeed} km/h`,
    `Acceleration: ${accident.peakAccelerationX.toFixed(2)}g / ${accident.peakAccelerationY.toFixed(2)}g / ${accident.peakAccelerationZ.toFixed(2)}g`,
    `Severity: ${accident.severity}`,
    `Confidence: ${(accident.confidenceScore * 100).toFixed(0)}%`,
    '',
    `Nearest Police Station: ${policeStation ? policeStation.name : 'Not found within search radius'}`,
    `Distance: ${policeStation ? policeStation.distanceKm + ' km' : 'N/A'}`,
    '',
    `Nearest Hospital: ${hospital ? hospital.name : 'Not found within search radius'}`,
    `Distance: ${hospital ? hospital.distanceKm + ' km' : 'N/A'}`,
    '',
    'Notification status: PENDING',
    '',
    '--- This is an automated alert from an academic prototype system. ---',
    '--- NOT a certified life-critical emergency service. Verify before acting. ---',
  ].join('\n');
}

/**
 * Get the active provider(s) for the current NOTIFICATION_MODE.
 */
function resolvePrimaryProvider() {
  switch (env.NOTIFICATION_MODE) {
    case 'email':
      return emailProvider;
    case 'console':
    default:
      return consoleProvider;
  }
}

/**
 * Dispatch a single notification (to either POLICE or HOSPITAL) and
 * persist the result. Never throws — always resolves.
 *
 * @param {object} params
 * @param {string} params.accidentId
 * @param {'POLICE'|'HOSPITAL'} params.recipientType
 * @param {string|null} params.policeStationId
 * @param {string|null} params.hospitalId
 * @param {string} params.message
 * @param {string} params.recipientLabel - human-readable name, for logs
 * @returns {Promise<object>} the persisted Notification record
 */
async function dispatchNotification({
  accidentId,
  recipientType,
  policeStationId = null,
  hospitalId = null,
  message,
  recipientLabel,
}) {
  const provider = resolvePrimaryProvider();
  const channel = env.NOTIFICATION_MODE === 'email' ? 'EMAIL' : 'CONSOLE';

  const notification = await prisma.notification.create({
    data: {
      accidentId,
      recipientType,
      policeStationId,
      hospitalId,
      channel,
      status: 'PENDING',
      message,
    },
  });

  try {
    const recipientEmail =
      recipientType === 'POLICE' ? env.DEMO_POLICE_EMAIL : env.DEMO_HOSPITAL_EMAIL;

    await provider.send({
      to: recipientEmail,
      subject: `ACCIDENT ALERT - ${recipientLabel}`,
      message,
    });

    // Optional SMS layered on top, best-effort, never blocks main flow.
    if (env.SMS_ENABLED) {
      try {
        await smsProvider.send({ to: recipientEmail, message });
      } catch (smsErr) {
        logger.warn('Optional SMS notification failed (non-blocking)', {
          error: smsErr.message,
          recipientType,
        });
      }
    }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'SENT', sentAt: new Date() },
    });

    logger.info('Notification dispatched successfully', {
      notificationId: notification.id,
      recipientType,
      channel,
    });

    return updated;
  } catch (err) {
    logger.error('Notification dispatch failed — accident record remains saved', {
      notificationId: notification.id,
      recipientType,
      error: err.message,
    });

    return prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'FAILED', errorDetail: err.message },
    });
  }
}

/**
 * High-level entry point: send both POLICE and HOSPITAL notifications
 * for a confirmed accident. Always resolves (never throws) so the
 * calling code can safely proceed regardless of delivery outcome.
 *
 * @param {object} params
 * @param {object} params.accident - the persisted Accident record
 * @param {object} params.vehicle - the associated Vehicle record
 * @param {object|null} params.policeStation - nearest police station (with distanceKm)
 * @param {object|null} params.hospital - nearest hospital (with distanceKm)
 * @returns {Promise<{police: object, hospital: object}>}
 */
async function sendAccidentNotifications({ accident, vehicle, policeStation, hospital }) {
  const message = buildAlertMessage({ accident, vehicle, policeStation, hospital });

  const [policeResult, hospitalResult] = await Promise.all([
    dispatchNotification({
      accidentId: accident.id,
      recipientType: 'POLICE',
      policeStationId: policeStation ? policeStation.id : null,
      message,
      recipientLabel: policeStation ? policeStation.name : 'Nearest Police Station',
    }),
    dispatchNotification({
      accidentId: accident.id,
      recipientType: 'HOSPITAL',
      hospitalId: hospital ? hospital.id : null,
      message,
      recipientLabel: hospital ? hospital.name : 'Nearest Hospital',
    }),
  ]);

  return { police: policeResult, hospital: hospitalResult };
}

module.exports = {
  sendAccidentNotifications,
  buildAlertMessage,
};
