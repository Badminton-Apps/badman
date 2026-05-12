// eslint-disable-next-line @typescript-eslint/no-var-requires
const env = process.env.NODE_ENV || "development";
require("dotenv").config({ path: `.env.${env}` });
require("dotenv").config();

const retries = 5;

console.log("Database Configuration:");
console.log("  DB_IP:", process.env.DB_IP);
console.log("  DB_PORT:", process.env.DB_PORT);
console.log("  DB_DATABASE:", process.env.DB_DATABASE);
console.log("  DB_USER:", process.env.DB_USER);
console.log("  DB_DIALECT:", process.env.DB_DIALECT);
console.log("  DB_SSL:", process.env.DB_SSL);

const dbBlock = {
  host: process.env.DB_IP,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: process.env.DB_DIALECT,
  migrationStorageTableSchema: "public",
  logging: false,
  dialectOptions: {
    ssl: process.env.DB_SSL === "true",
  },
  retry: {
    max: retries,
  },
};

const config = {
  development: dbBlock,
  staging: dbBlock,
  production: dbBlock,
  prod: dbBlock,
};

module.exports = config;
