// We need dontenv before App!!!
import dotenv from 'dotenv';
dotenv.config();

import { App, AuthenticationSercice, logger, startWhenReady } from '@badvlasim/shared';

import { Router } from 'express';
import { JobController } from './controllers';
import { VisualService } from './models/jobs/visualService';

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

  VisualService.initializeCache();

  const app = new App( {
    controllers: [new JobController(Router(), authService.checkAuth)]
  });

  app.listen(); 
};
 