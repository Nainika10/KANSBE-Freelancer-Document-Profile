const { Queue } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { sendEmail, buildWelcomeEmailHtml, buildOtpEmailHtml } = require('../services/emailservice');

// Create dedicated connection using centralized options (supports redis:// and rediss://)
const connection = createRedisConnection();

const emailQueue = new Queue('emailQueue', { 
  connection,
  prefix: '{kansbeEmailQueue}' 
});

async function queueWelcomeEmail({ userId, fullname, email, userType = 'user' }) {
  try {
    return await emailQueue.add('send-welcome-email', { userId, fullname, email, userType }, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false
    });
  } catch (err) {
    console.warn('[emailQueue] Redis unavailable or quota reached. Sending welcome email directly:', err.message);
    const subject = 'Greetings';
    const message = buildWelcomeEmailHtml(fullname, userType);
    return sendEmail(email, subject, message);
  }
}

async function queueOtpEmail({ userId, fullname, email, otp, userType = 'user' }) {
  try {
    return await emailQueue.add('send-otp-email', { userId, fullname, email, otp, userType }, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false
    });
  } catch (err) {
    console.warn('[emailQueue] Redis unavailable or quota reached. Sending OTP email directly:', err.message);
    const subject = 'KansBe - Email Verification OTP';
    const message = buildOtpEmailHtml(fullname, otp);
    return sendEmail(email, subject, message);
  }
}

module.exports = { emailQueue, queueWelcomeEmail, queueOtpEmail };
