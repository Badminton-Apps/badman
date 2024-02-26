// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

const retries = 5;
const config = {
  development: {
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
  },
  beta: {
    host: process.env.DB_BETA_IP,
    port: process.env.DB_BETA_PORT,
    database: process.env.DB_BETA_DATABASE,
    username: process.env.DB_BETA_USER,
    password: process.env.DB_BETA_PASSWORD,
    dialect: process.env.DB_BETA_DIALECT,
    migrationStorageTableSchema: 'public',
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_BETA_SSL === 'true',
    },
    retry: {
      max: retries,
    },
  },
  prod: {
    host: process.env.DB_PROD_IP,
    port: process.env.DB_PROD_PORT,
    database: process.env.DB_PROD_DATABASE,
    username: process.env.DB_PROD_USER,
    password: process.env.DB_PROD_PASSWORD,
    dialect: process.env.DB_PROD_DIALECT,
    migrationStorageTableSchema: 'public',
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_PROD_SSL === 'true',
    },
    retry: {
      max: retries,
    },
  },
};

console.log('config', config);

module.exports = config;
