require('dotenv').config();

// Validate required variables
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_EXPIRE',
  'BCRYPT_SALT',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`Missing required env variable: ${key}`);
  }
});

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '24h',
  BCRYPT_SALT: parseInt(process.env.BCRYPT_SALT, 10) || 12,
  RATE_LIMIT_WINDOW_MS:
    parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  RATE_LIMIT_MAX_REQUESTS:
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
};

module.exports = { env };
