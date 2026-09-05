/**
 * backend/src/services/dashboard.service.js
 *
 * Aggregated statistics for the dashboard overview page (req #9):
 *   - Total vehicles
 *   - Total accidents
 *   - Accidents today
 *   - Critical accidents
 *   - Pending notifications
 *   - Police notifications (sent count)
 *   - Hospital notifications (sent count)
 *   - Recent accidents table
 */

const prisma = require('../config/prisma');

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * @returns {Promise<object>} dashboard summary stats
 */
async function getDashboardStats() {
  const todayStart = startOfToday();

  const [
    totalVehicles,
    totalAccidents,
    accidentsToday,
    criticalAccidents,
    pendingNotifications,
    policeNotificationsSent,
    hospitalNotificationsSent,
    recentAccidents,
  ] = await Promise.all([
    prisma.vehicle.count(),
    prisma.accident.count(),
    prisma.accident.count({ where: { occurredAt: { gte: todayStart } } }),
    prisma.accident.count({ where: { severity: 'CRITICAL' } }),
    prisma.notification.count({ where: { status: 'PENDING' } }),
    prisma.notification.count({ where: { recipientType: 'POLICE', status: 'SENT' } }),
    prisma.notification.count({ where: { recipientType: 'HOSPITAL', status: 'SENT' } }),
    prisma.accident.findMany({
      include: {
        vehicle: true,
        nearestPoliceStation: true,
        nearestHospital: true,
        notifications: true,
      },
      orderBy: { occurredAt: 'desc' },
      take: 10,
    }),
  ]);

  return {
    totalVehicles,
    totalAccidents,
    accidentsToday,
    criticalAccidents,
    pendingNotifications,
    policeNotificationsSent,
    hospitalNotificationsSent,
    recentAccidents,
  };
}

/**
 * Severity breakdown for a simple bar/pie chart on the dashboard.
 */
async function getSeverityBreakdown() {
  const results = await prisma.accident.groupBy({
    by: ['severity'],
    _count: { severity: true },
  });

  return results.reduce((acc, row) => {
    acc[row.severity] = row._count.severity;
    return acc;
  }, { MINOR: 0, MODERATE: 0, SEVERE: 0, CRITICAL: 0 });
}

/**
 * Accidents-per-day for the last N days, for a trend chart.
 * @param {number} days
 */
async function getAccidentTrend(days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const accidents = await prisma.accident.findMany({
    where: { occurredAt: { gte: since } },
    select: { occurredAt: true },
  });

  const buckets = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = 0;
  }

  accidents.forEach((a) => {
    const key = new Date(a.occurredAt).toISOString().slice(0, 10);
    if (buckets[key] !== undefined) buckets[key] += 1;
  });

  return Object.entries(buckets).map(([date, count]) => ({ date, count }));
}

module.exports = {
  getDashboardStats,
  getSeverityBreakdown,
  getAccidentTrend,
};
