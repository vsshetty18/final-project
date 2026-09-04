/**
 * backend/src/config/logger.js
 *
 * Lightweight structured logger.
 * Keeps a consistent log format across the app without pulling in
 * a heavy dependency like winston/pino — sufficient for an
 * academic prototype while still being structured and levelled.
 */

const env = require('./env');

const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = env.NODE_ENV === 'production' ? LEVELS.info : LEVELS.debug;

function timestamp() {
  return new Date().toISOString();
}

function formatMeta(meta) {
  if (!meta || Object.keys(meta).length === 0) return '';
  try {
    return ' ' + JSON.stringify(meta);
  } catch (err) {
    return ' [unserializable meta]';
  }
}

function log(level, message, meta) {
  if (LEVELS[level] > currentLevel) return;
  const line = `[${timestamp()}] [${level.toUpperCase()}] ${message}${formatMeta(meta)}`;
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(line);
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),
};

module.exports = logger;
