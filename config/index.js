const { connectDB, disconnectDB } = require('./db.config');
const { env } = require('./env.config');

module.exports = {
  connectDB,
  disconnectDB,
  env,
};
