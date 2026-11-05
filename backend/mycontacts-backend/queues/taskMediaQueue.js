const { Queue } = require('bullmq');
const { createRedisConnection } = require('../config/redis');

// Create dedicated connection using centralized options (supports redis:// and rediss://)
const connection = createRedisConnection();

const taskMediaWorkerQueue = new Queue('task-media-processing', {
  connection,
  prefix: '{kansbeTaskQueue}'
});

module.exports = { taskMediaWorkerQueue };
