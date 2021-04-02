// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

const retries = 1;

module.exports = {
  host: process.env.DB_IP,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: process.env.DB_DIALECT,
  migrationStorageTableSchema: 'public',
  logging: false,
  retry: {
    max: retries,
    timeout: 30000
  },
  pool: {
    max: 750,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};
