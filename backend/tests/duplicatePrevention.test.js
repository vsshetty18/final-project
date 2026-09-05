/**
 * backend/tests/duplicatePrevention.test.js
 *
 * Unit tests for the cooldown/debounce mechanism in
 * accident.service.js that prevents duplicate accident records from
 * a single continuous collision event (req #17, tested per req #22).
 *
 * Prisma is mocked so these tests run without a real database
 * connection.
 */

jest.mock('../src/config/prisma', () => ({
  accident: {
    findFirst: jest.fn(),
  },
  vehicle: {
    findUnique: jest.fn(),
  },
  notification: {
    create: jest.fn(),
    update: jest.fn(),
  },
  policeStation: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  hospital: {
    findMany: jest.fn().mockResolvedValue([]),
  },
}));

const prisma = require('../src/config/prisma');
const { isInCooldown } = require('../src/services/accident.service');
const { THRESHOLDS } = require('../src/constants/thresholds');

describe('accident.service - isInCooldown (duplicate accident prevention)', () => {
  const vehicleId = 'vehicle-cooldown-test';

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns false when the vehicle has no prior accidents', async () => {
    prisma.accident.findFirst.mockResolvedValue(null);

    const result = await isInCooldown(vehicleId);

    expect(result).toBe(false);
  });

  test('returns true when the last accident occurred within the cooldown window', async () => {
    const recentAccidentTime = new Date(Date.now() - 5000); // 5 seconds ago
    prisma.accident.findFirst.mockResolvedValue({ occurredAt: recentAccidentTime });

    const result = await isInCooldown(vehicleId);

    expect(result).toBe(true);
  });

  test('returns false when the last accident occurred outside the cooldown window', async () => {
    const oldAccidentTime = new Date(Date.now() - (THRESHOLDS.COOLDOWN_SECONDS + 30) * 1000);
    prisma.accident.findFirst.mockResolvedValue({ occurredAt: oldAccidentTime });

    const result = await isInCooldown(vehicleId);

    expect(result).toBe(false);
  });

  test('queries using the correct vehicleId and orders by most recent', async () => {
    prisma.accident.findFirst.mockResolvedValue(null);

    await isInCooldown(vehicleId);

    expect(prisma.accident.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vehicleId },
        orderBy: { occurredAt: 'desc' },
      })
    );
  });
});
