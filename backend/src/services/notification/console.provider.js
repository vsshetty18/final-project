/**
 * backend/src/services/notification/console.provider.js
 *
 * Console/demo notification provider.
 *
 * This is the DEFAULT provider (NOTIFICATION_MODE=console) and the
 * always-available fallback for the academic demo — it requires no
 * external credentials and cannot fail due to network/SMTP issues,
 * making it ideal for viva presentations where reliability matters
 * more than real-world delivery.
 *
 * It "sends" a notification by writing a clearly formatted block to
 * the server console/log output, simulating what a real police/
 * hospital dispatch notification would contain.
 */

const logger = require('../../config/logger');

/**
 * @param {{to:string, subject:string, message:string}} params
 * @returns {Promise<{provider:string, deliveredTo:string}>}
 */
async function send({ to, subject, message }) {
  const banner = '='.repeat(70);
  // eslint-disable-next-line no-console
  console.log(`\n${banner}\n[DEMO NOTIFICATION - CONSOLE PROVIDER]\nTo: ${to}\nSubject: ${subject}\n${banner}\n${message}\n${banner}\n`);

  logger.info('Console notification delivered (simulated)', { to, subject });

  return { provider: 'console', deliveredTo: to };
}

module.exports = { send };
