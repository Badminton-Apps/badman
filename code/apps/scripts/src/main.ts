import { creatSequelizeInstance } from '@badman/api/database';
import { Logger } from '@nestjs/common';
import { FixGendersRunner } from './app/fix-ranking-genders';

(async () => {
  const logger = new Logger('Scripts');
  logger.log('Starting script');

  logger.debug('Creating sequelize instance');
  const sequelize = await creatSequelizeInstance();

  logger.debug('Creating Runner');
  const genders = new FixGendersRunner(sequelize);

  logger.debug('Processing');
  await genders.process();

  logger.log('Done');
})();
