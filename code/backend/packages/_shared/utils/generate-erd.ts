import { writeFileSync } from 'fs';
import sequelizeErd from 'sequelize-erd';
import { DataBaseHandler } from '../database';

(async () => {
  // initializes instance
  new DataBaseHandler({
    dialect: 'sqlite',
    storage: ':memory:',
  });

  const svg = await sequelizeErd({
    source: DataBaseHandler.sequelizeInstance,
    engine: 'twopi',
  }); // dot
  writeFileSync('../../../../erd.svg', svg);
})();
