const { Worker } = require('bullmq');
const { sendEmail, buildWelcomeEmailHtml, buildOtpEmailHtml } = require('../services/emailservice');
const { createRedisConnection } = require('../config/redis');

// Create dedicated worker connection (supports redis:// and rediss://)
const connection = createRedisConnection();

let isQuotaExceededWarned = false;

const worker = new Worker('emailQueue', async (job) => {
  const { name, data } = job;
  if (name === 'send-welcome-email') {
    const { fullname, email, userType } = data;
    const subject = 'Greetings';
    const message = buildWelcomeEmailHtml(fullname, userType);
    await sendEmail(email, subject, message);
    return { ok: true };
  }

  if (name === 'send-otp-email') {
    const { fullname, email, otp } = data;
    const subject = 'KansBe - Email Verification OTP';
    const message = buildOtpEmailHtml(fullname, otp);
    await sendEmail(email, subject, message);
    return { ok: true };
  }

  return { skipped: true };
}, { 
  connection,
  prefix: '{kansbeEmailQueue}',
  drainDelay: 5000,       // Sleep 5s when queue is empty to avoid burning Upstash requests
  stalledInterval: 60000  // Check stalled jobs every 60s instead of 30s
});

worker.on('completed', (job) => {
  console.log(`Email job completed: ${job.id} ${job.name}`);
});

worker.on('failed', (job, err) => {
  console.error(`Email job failed: ${job?.id} ${job?.name}`, err?.message || err);
});

worker.on('error', (err) => {
  if (err?.message?.includes('max requests limit exceeded')) {
    if (!isQuotaExceededWarned) {
      console.error('⚠️ [Email Worker] Upstash Redis request limit reached (500k). Worker is throttled.');
      isQuotaExceededWarned = true;
      setTimeout(() => { isQuotaExceededWarned = false; }, 60000);
    }
  } else {
    console.error('[Email Worker Error]', err?.message || err);
  }
});

// PM2 / standalone graceful shutdown handler
const handleShutdown = async (signal) => {
  console.log(`[Email Worker] Received ${signal}. Shutting down...`);
  try {
    await worker.close();
    await connection.quit();
    console.log('[Email Worker] Closed cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('[Email Worker] Shutdown error:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = worker;
