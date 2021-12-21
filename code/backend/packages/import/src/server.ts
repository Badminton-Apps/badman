// We need dontenv before App!!!
import dotenv from 'dotenv';
dotenv.config();

import {
  App,
  AuthenticationSercice,
  logger,
  startWhenReady
} from '@badvlasim/shared';
import { Router } from 'express';
import { ImportController } from './controllers';
import { Convertor } from './convert';


try {
  (async () => {
    try {
      logger.info(`Starting ${process.env.SERVICE_NAME} version ${process.env.SERVICE_VERSION}`);
      await startWhenReady(false, false, () => startServer());
    } catch (e) {
      logger.error('Something failed', e);
      throw e;
    }
  })();
} catch (err) {
  logger.error('Something failed', err);
  throw err;
}
const startServer = () => {
  const authService = new AuthenticationSercice();

  const converter = new Convertor();

  const app = new App([new ImportController(Router(), authService.checkAuth, converter)]);
  app.listen();
};
