/**
 * backend/src/services/notification/email.provider.js
 *
 * Email notification provider using SMTP via nodemailer.
 *
 * If SMTP credentials are not configured (common during early
 * development or a viva where the presenter doesn't want to expose
 * a real inbox), this provider transparently falls back to the
 * console provider's simulated output instead of throwing, satisfying
 * requirement #8: "provide a working notification simulation if
 * external SMS/email credentials are unavailable."
 *
 * NEVER hard-code credentials here — always sourced from env.js
 * (which reads environment variables).
 */

const nodemailer = require('nodemailer');
const env = require('../../config/env');
const logger = require('../../config/logger');
const consoleProvider = require('./console.provider');

let cachedTransporter = null;

function isSmtpConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
}

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  return cachedTransporter;
}

/**
 * @param {{to:string, subject:string, message:string}} params
 * @returns {Promise<{provider:string, deliveredTo:string, messageId?:string}>}
 */
async function send({ to, subject, message }) {
  if (!isSmtpConfigured()) {
    logger.warn('SMTP credentials not configured — falling back to console notification simulation');
    const result = await consoleProvider.send({ to, subject, message });
    return { ...result, provider: 'email-fallback-console' };
  }

  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from: env.SMTP_FROM_EMAIL,
    to,
    subject,
    text: message,
  });

  logger.info('Email notification sent', { to, subject, messageId: info.messageId });

  return { provider: 'email', deliveredTo: to, messageId: info.messageId };
}

module.exports = { send };
