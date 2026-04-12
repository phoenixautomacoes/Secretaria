const Redis = require('ioredis');
const { REDIS_URL } = require('./env');

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redis.on('error', (err) => console.error('[Redis] Erro:', err.message));
redis.on('connect', () => console.log('[Redis] Conectado'));

module.exports = redis;
