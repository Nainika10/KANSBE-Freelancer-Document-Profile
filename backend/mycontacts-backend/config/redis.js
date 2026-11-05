const IORedis = require('ioredis');

/**
 * Returns connection configuration options suitable for BullMQ and standard IORedis.
 * Supports BOTH:
 * - Standard Redis (redis://) without TLS (Original Redis, Docker, VPS, Localhost)
 * - Secure Redis (rediss://) with TLS (Upstash, AWS ElastiCache TLS, Redis Cloud TLS)
 */
function getRedisConnectionOptions(customUrl) {
  const url = customUrl || process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const isTls = typeof url === 'string' && url.startsWith('rediss://');

  const options = {
    maxRetriesPerRequest: null, // REQUIRED by BullMQ
    enableReadyCheck: false,    // Recommended by BullMQ to prevent connection stalls
    retryStrategy(times) {
      // Reconnect with exponential backoff up to 3s
      // Never return null in production so that Redis restarts or network hiccups don't kill the connection
      return Math.min(times * 500, 3000);
    }
  };

  // ONLY attach TLS configuration if the URL explicitly requests rediss://
  if (isTls) {
    options.tls = {
      rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED === 'true' ? true : false
    };
  }

  return { url, options };
}

/**
 * Factory function to create a new dedicated IORedis connection.
 * Each BullMQ Queue and Worker instance requires its own connection.
 */
function createRedisConnection(customUrl) {
  const { url, options } = getRedisConnectionOptions(customUrl);
  const client = new IORedis(url, options);

  client.on('error', (err) => {
    console.error('[Redis Error]', err.message);
  });

  return client;
}

// Default client for direct Redis caching / ping / utility
const defaultClient = createRedisConnection();

defaultClient.on('connect', () => {
  console.log('Redis connected successfully');
});

// Attach factory functions to default client for backward compatibility
defaultClient.createRedisConnection = createRedisConnection;
defaultClient.getRedisConnectionOptions = getRedisConnectionOptions;
defaultClient.redis = defaultClient;

module.exports = defaultClient;
