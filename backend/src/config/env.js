/**
 * backend/src/config/env.js
 *
 * Centralized environment configuration loader.
 * Every other module should import `env` from here instead of
 * reading process.env directly, so defaults, types, and validation
 * are handled in exactly one place.
 */

require('dotenv').config();

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: toNumber(process.env.PORT, 5000),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',

  // Auth
  JWT_SECRET: process.env.JWT_SECRET || 'dev_only_insecure_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BCRYPT_SALT_ROUNDS: toNumber(process.env.BCRYPT_SALT_ROUNDS, 10),

  // Accident detection thresholds
  DECELERATION_THRESHOLD_G: toNumber(process.env.DECELERATION_THRESHOLD_G, 4.5),
  ACCELERATION_SPIKE_THRESHOLD_G: toNumber(process.env.ACCELERATION_SPIKE_THRESHOLD_G, 6.0),
  GYRO_ABNORMAL_THRESHOLD_DPS: toNumber(process.env.GYRO_ABNORMAL_THRESHOLD_DPS, 250),
  MIN_CONFIDENCE_TO_FLAG: toNumber(process.env.MIN_CONFIDENCE_TO_FLAG, 0.55),
  ACCIDENT_COOLDOWN_SECONDS: toNumber(process.env.ACCIDENT_COOLDOWN_SECONDS, 120),
  SENSOR_BUFFER_WINDOW_SECONDS: toNumber(process.env.SENSOR_BUFFER_WINDOW_SECONDS, 10),

  // Geo lookup
  GEO_LOOKUP_MODE: process.env.GEO_LOOKUP_MODE || 'mock',
  GEO_SEARCH_RADIUS_KM: toNumber(process.env.GEO_SEARCH_RADIUS_KM, 15),
  PLACES_API_KEY: process.env.PLACES_API_KEY || '',

  // Notifications
  NOTIFICATION_MODE: process.env.NOTIFICATION_MODE || 'console',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: toNumber(process.env.SMTP_PORT, 587),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'alerts@smart-vehicle-system.local',

  SMS_ENABLED: toBoolean(process.env.SMS_ENABLED, false),
  SMS_ACCOUNT_SID: process.env.SMS_ACCOUNT_SID || '',
  SMS_AUTH_TOKEN: process.env.SMS_AUTH_TOKEN || '',
  SMS_FROM_NUMBER: process.env.SMS_FROM_NUMBER || '',

  DEMO_POLICE_EMAIL: process.env.DEMO_POLICE_EMAIL || 'demo-police@example.com',
  DEMO_HOSPITAL_EMAIL: process.env.DEMO_HOSPITAL_EMAIL || 'demo-hospital@example.com',

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 60000),
  RATE_LIMIT_MAX_REQUESTS: toNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
};

// Fail fast in production if critical secrets are missing/insecure.
function validateEnv() {
  const problems = [];

  if (!env.DATABASE_URL) {
    problems.push('DATABASE_URL is not set.');
  }

  if (env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
      problems.push('JWT_SECRET must be set to a strong value in production.');
    }
    if (env.NOTIFICATION_MODE === 'email' && (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD)) {
      problems.push('NOTIFICATION_MODE=email requires SMTP_HOST, SMTP_USER, SMTP_PASSWORD in production.');
    }
  }

  if (problems.length > 0) {
    // eslint-disable-next-line no-console
    console.error('Environment configuration problems detected:\n' + problems.map((p) => ` - ${p}`).join('\n'));
    if (env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

validateEnv();

module.exports = env;
