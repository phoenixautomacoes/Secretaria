const prisma = require('../../config/prisma');
const redis = require('../../config/redis');
const asyncHandler = require('../../shared/utils/asyncHandler');

const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));

const check = asyncHandler(async (req, res) => {
  let dbStatus = 'ok';
  let redisStatus = 'ok';

  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout(3000)]);
  } catch {
    dbStatus = 'error';
  }

  try {
    await Promise.race([redis.ping(), timeout(3000)]);
  } catch {
    redisStatus = 'error';
  }

  const healthy = dbStatus === 'ok' && redisStatus === 'ok';

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    status: healthy ? 'healthy' : 'degraded',
    services: { database: dbStatus, redis: redisStatus },
    timestamp: new Date().toISOString(),
  });
});

module.exports = { check };
