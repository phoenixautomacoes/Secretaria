const { NODE_ENV } = require('../../config/env');

const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = NODE_ENV === 'production' ? 2 : 3;

const format = (level, message, meta) => {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] ${message}`;
  return meta ? `${base} ${JSON.stringify(meta)}` : base;
};

const log = (level, message, meta) => {
  if (levels[level] <= currentLevel) {
    const output = format(level, message, meta);
    if (level === 'error') console.error(output);
    else console.log(output);
  }
};

const logger = {
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};

module.exports = logger;
