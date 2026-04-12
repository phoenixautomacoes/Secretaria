const rateLimit = require('express-rate-limit');

const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas requisições, tente novamente em breve', code: 'RATE_LIMIT' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas tentativas de login', code: 'RATE_LIMIT' },
});

module.exports = { defaultLimiter, authLimiter };
