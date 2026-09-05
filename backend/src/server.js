/**
 * backend/src/server.js
 *
 * Server entry point. Binds the Express app (app.js) to a port and
 * sets up graceful shutdown handling so in-flight requests and the
 * Prisma connection close cleanly.
 */

const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const prisma = require('./config/prisma');

const server = app.listen(env.PORT, () => {
  logger.info(`Smart Vehicle Accident Detection API listening on port ${env.PORT}`, {
    environment: env.NODE_ENV,
  });
});

/**
 * Graceful shutdown: stop accepting new connections, close the DB
 * connection, then exit. Triggered on SIGINT/SIGTERM (Ctrl+C, or
 * container/orchestrator stop signals in cloud deployment).
 */
function shutdown(signal) {
  logger.info(`Received ${signal} — shutting down gracefully...`);

  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed. Exiting.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', { error: err.message });
      process.exit(1);
    }
  });

  // Force exit if graceful shutdown takes too long.
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason: reason?.message || reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});
