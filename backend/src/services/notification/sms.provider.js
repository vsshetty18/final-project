/**
 * backend/src/services/notification/sms.provider.js
 *
 * Optional SMS notification provider, shaped around a Twilio-style
 * integration. This is an OPTIONAL layer on top of the primary
 * notification channel (console/email), enabled only when
 * SMS_ENABLED=true.
 *
 * No SMS SDK is bundled by default (keeps the academic project
 * dependency-light and avoids requiring a paid Twilio account just
 * to run the demo). If SMS_ENABLED=true but credentials are missing,
 * this provider simulates the send via a console log rather than
 * failing the whole notification flow — consistent with requirement
 * #8's "working notification simulation if credentials are
 * unavailable" rule.
 *
 * To wire a real provider later:
 *   1. `npm install twilio` in backend/
 *   2. Uncomment the twilio client block below
 *   3. Set SMS_ACCOUNT_SID / SMS_AUTH_TOKEN / SMS_FROM_NUMBER in .env
 */

const env = require('../../config/env');
const logger = require('../../config/logger');

function isSmsConfigured() {
  return Boolean(env.SMS_ACCOUNT_SID && env.SMS_AUTH_TOKEN && env.SMS_FROM_NUMBER);
}

/**
 * @param {{to:string, message:string}} params
 * @returns {Promise<{provider:string, deliveredTo:string, simulated:boolean}>}
 */
async function send({ to, message }) {
  if (!isSmsConfigured()) {
    // eslint-disable-next-line no-console
    console.log(`\n[DEMO SMS SIMULATION] To: ${to}\nMessage: ${message.slice(0, 160)}...\n`);
    logger.info('SMS notification simulated (no credentials configured)', { to });
    return { provider: 'sms-simulated', deliveredTo: to, simulated: true };
  }

  // ---------------------------------------------------------------
  // Real Twilio integration (requires `npm install twilio`):
  //
  // const twilio = require('twilio');
  // const client = twilio(env.SMS_ACCOUNT_SID, env.SMS_AUTH_TOKEN);
  // const result = await client.messages.create({
  //   body: message.slice(0, 320), // SMS length constraints
  //   from: env.SMS_FROM_NUMBER,
  //   to,
  // });
  // logger.info('SMS notification sent', { to, sid: result.sid });
  // return { provider: 'sms', deliveredTo: to, simulated: false, sid: result.sid };
  // ---------------------------------------------------------------

  logger.warn('SMS credentials present but Twilio SDK is not installed in this prototype — simulating instead');
  return { provider: 'sms-simulated', deliveredTo: to, simulated: true };
}

module.exports = { send };
