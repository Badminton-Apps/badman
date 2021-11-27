// We need dontenv before App!!!
import dotenv from 'dotenv';
dotenv.config();
import pkg from '../package.json'


import {
  App,
  AuthenticationSercice,
  logger,
  startWhenReady
} from '@badvlasim/shared';

import { Router } from 'express';
import { JobController } from './controllers';

try {
  (async () => {
    try {
      logger.info(`Starting ${process.env.SERVICE_NAME} version ${pkg.version}`);
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

  const app = new App([new JobController(Router(), authService.checkAuth)]);
  app.listen();
};
