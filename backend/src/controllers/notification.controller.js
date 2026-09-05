/**
 * backend/src/controllers/notification.controller.js
 *
 * HTTP layer for notification records (req #8). Allows the dashboard
 * to list notifications (e.g. for a specific accident) and mark a
 * notification as acknowledged (simulating a police/hospital
 * dispatcher confirming receipt).
 */

const prisma = require('../config/prisma');
const { asyncHandler } = require('../middleware/error.middleware');
const { success, notFound } = require('../utils/apiResponse.util');

/**
 * GET /api/notifications?accidentId=...
 */
const listNotifications = asyncHandler(async (req, res) => {
  const { accidentId, status, recipientType } = req.query;
  const where = {};
  if (accidentId) where.accidentId = accidentId;
  if (status) where.status = status;
  if (recipientType) where.recipientType = recipientType;

  const notifications = await prisma.notification.findMany({
    where,
    include: { policeStation: true, hospital: true, accident: true },
    orderBy: { createdAt: 'desc' },
  });

  return success(res, { message: 'Notifications fetched successfully', data: notifications });
});

/**
 * GET /api/notifications/:id
 */
const getNotification = asyncHandler(async (req, res) => {
  const notification = await prisma.notification.findUnique({
    where: { id: req.params.id },
    include: { policeStation: true, hospital: true, accident: true },
  });
  if (!notification) return notFound(res, 'Notification not found');
  return success(res, { message: 'Notification fetched successfully', data: notification });
});

/**
 * PATCH /api/notifications/:id/acknowledge
 *
 * Simulates a dispatcher (police/hospital) acknowledging receipt of
 * the emergency alert (req: "Response/acknowledgement status").
 */
const acknowledgeNotification = asyncHandler(async (req, res) => {
  const notification = await prisma.notification.update({
    where: { id: req.params.id },
    data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
  });

  // If both police and hospital notifications for this accident are
  // acknowledged, mark the accident itself as ACKNOWLEDGED.
  const siblingNotifications = await prisma.notification.findMany({
    where: { accidentId: notification.accidentId },
  });
  const allAcknowledged = siblingNotifications.every((n) => n.status === 'ACKNOWLEDGED');
  if (allAcknowledged) {
    await prisma.accident.update({
      where: { id: notification.accidentId },
      data: { status: 'ACKNOWLEDGED' },
    });
  }

  return success(res, { message: 'Notification acknowledged successfully', data: notification });
});

module.exports = {
  listNotifications,
  getNotification,
  acknowledgeNotification,
};
