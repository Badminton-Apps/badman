// We need dontenv before App!!!
import dotenv from 'dotenv';
dotenv.config();
import pkg from '../package.json'

import {
  App,
  AuthenticationSercice,
  DataBaseHandler,
  logger,
  startWhenReady
} from '@badvlasim/shared';
import { Router } from 'express';
import { ImportController } from './controllers/import.controller';
import { Convertor } from './convert/convertor';


try {
  (async () => {
    try {
      logger.info(`Starting ${process.env.SERVICE_NAME} version ${pkg.version}`);
      await startWhenReady(false, false, db => startServer(db));
    } catch (e) {
      logger.error('Something failed', e);
      throw e;
    }
  })();
} catch (err) {
  logger.error('Something failed', err);
  throw err;
}
const startServer = (databaseService: DataBaseHandler) => {
  const authService = new AuthenticationSercice();

  const converter = new Convertor();

  const app = new App([new ImportController(Router(), authService.checkAuth, converter)]);
  app.listen();
};
