/**
 * backend/src/config/prisma.js
 *
 * Shared Prisma Client singleton.
 *
 * In development, nodemon restarts can create many PrismaClient
 * instances and exhaust database connections. We guard against
 * that by caching the client on `global` in non-production envs.
 */

const { PrismaClient } = require('@prisma/client');
const env = require('./env');

let prisma;

if (env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['warn', 'error'],
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['warn', 'error'],
    });
  }
  prisma = global.__prisma;
}

module.exports = prisma;
