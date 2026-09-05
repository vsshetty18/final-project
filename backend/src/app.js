/**
 * backend/src/app.js
 *
 * Express application setup: security middleware, CORS, logging,
 * rate limiting, and all route mounts (req #14 clean REST APIs).
 * Exported separately from server.js so it can be imported directly
 * in tests (supertest) without binding to a real port.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const logger = require('./config/logger');
const { generalLimiter } = require('./middleware/rateLimit.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const sensorRoutes = require('./routes/sensor.routes');
const accidentRoutes = require('./routes/accident.routes');
const { policeStationRouter, hospitalRouter } = require('./routes/station.routes');
const notificationRoutes = require('./routes/notification.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const simulationRoutes = require('./routes/simulation.routes');

const app = express();

// ---------------------------------------------------------------------
// Security & core middleware (req #15)
// ---------------------------------------------------------------------
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging — pipe morgan output through our logger.
app.use(
  morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Global rate limiting for all API routes.
app.use('/api', generalLimiter);

// ---------------------------------------------------------------------
// Health check (useful for deployment platforms / uptime checks)
// ---------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Smart Vehicle Accident Detection API is running',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------
// Route mounts (req #14)
// ---------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/sensor-data', sensorRoutes);
app.use('/api/accidents', accidentRoutes);
app.use('/api/police-stations', policeStationRouter);
app.use('/api/hospitals', hospitalRouter);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/simulation', simulationRoutes);

// ---------------------------------------------------------------------
// 404 + centralized error handling (req #16) — must be last
// ---------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
