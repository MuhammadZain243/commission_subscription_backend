const { connectDB } = require('./db.config');
const { env } = require('./env.config');

module.exports = {
  connectDB,
  env,
};
