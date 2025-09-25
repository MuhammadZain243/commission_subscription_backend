const { env } = require('../config');

const isDev = env.NODE_ENV === 'development';

const logger = {
  info: (msg, data) => {
    if (isDev) console.log(msg, data || '');
  },
  warn: (msg, data) => {
    if (isDev) console.warn(msg, data || '');
  },
  error: (msg, data) => {
    if (isDev) console.error(msg, data || '');
  },
};

module.exports = { logger };
