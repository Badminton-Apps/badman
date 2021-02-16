import sequelizeErd from 'sequelize-erd';
import { writeFileSync } from 'fs';
import * as sequelizeModels from '../models/sequelize';
import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import { DataBaseHandler } from '..';

(async () => {
  // initializes instance
  new DataBaseHandler({
    dialect: 'sqlite',
    storage: ':memory:'
  });

  const svg = await sequelizeErd({
    source: DataBaseHandler.sequelizeInstance,
    engine: 'twopi'
  }); // dot
  writeFileSync('../../../../erd.svg', svg);
})();
