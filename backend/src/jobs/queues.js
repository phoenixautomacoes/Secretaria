const { Queue } = require('bullmq');
const redisConnection = require('../config/redis');

const automationQueue = new Queue('automations', { connection: redisConnection });
const schedulerQueue = new Queue('scheduler', { connection: redisConnection });

module.exports = { automationQueue, schedulerQueue };
