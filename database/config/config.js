// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

const retries = 5;
const config = {
  host: process.env.DB_IP,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: process.env.DB_DIALECT,
  migrationStorageTableSchema: 'public',
  logging: false,
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true',
  },
  retry: {
    max: retries,
  },
};

module.exports = config;
