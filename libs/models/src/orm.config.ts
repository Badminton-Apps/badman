// !!!!!
// has to live here otherwise models are not recognized
// !!!!!

import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AppUser, RankingSystem } from './models';
config();

const addMigrations = process.env['RUN_MIGRATIONS']?.trim() === 'true';
const dbType = process.env['DB_TYPE']?.trim();

if (!dbType) {
  throw new Error('DB_TYPE is not set');
}

const entities = [AppUser, RankingSystem]; //, Add the other entities here

export let ormConfig: DataSourceOptions | null = null;

if (dbType === 'postgres') {
  ormConfig = {
    type: 'postgres',
    host: process.env['DB_IP'],
    port: process.env['DB_PORT'] ? parseInt(process.env['DB_PORT']) : 5432,
    username: process.env['DB_USER'],
    password: process.env['DB_PASSWORD'],
    database: process.env['DB_DATABASE'],
    ssl:
      process.env['DB_SSL'] === 'true' ? { rejectUnauthorized: false } : false,
    migrationsTableName: 'typeorm_migrations',
    applicationName: process.env['VITE_APP_ID'],
    options: { trustServerCertificate: true },
    // below is a fix so that the migrations can run because they are typescript
    migrations: addMigrations
      ? ['libs/backend/database/src/migrations/*.ts']
      : undefined,
    entities,
    // logging: true,
    synchronize: false,
    migrationsRun: false,
  } as DataSourceOptions;
} else if (dbType === 'sqlite') {
  ormConfig = {
    type: 'sqlite',
    database: process.env['DB_DATABASE'],
    entities,
    // logging: true,
    synchronize: false,
  } as DataSourceOptions;
} else if (dbType === 'in-memory') {
  ormConfig = {
    type: 'sqlite',
    database: ':memory:',
    entities,
    // logging: true,
    synchronize: true,
  } as DataSourceOptions;
} else {
  throw new Error('DB_TYPE is invalid');
}

if (!ormConfig) {
  throw new Error('ormConfig is null');
}

const datasource = new DataSource(ormConfig);
datasource.initialize();
export default datasource;
