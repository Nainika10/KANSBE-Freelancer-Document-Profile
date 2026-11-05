const { Queue } = require('bullmq');
const { createRedisConnection } = require('../config/redis');

// Create dedicated connection using centralized options (supports redis:// and rediss://)
const connection = createRedisConnection();

const portfolioWorkerQueue = new Queue('portfolio-processing', {
  connection,
  prefix: '{kansbePortfolioQueue}'
});

module.exports = { portfolioWorkerQueue };
