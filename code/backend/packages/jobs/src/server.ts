// We need dontenv before App!!!
import dotenv from 'dotenv';
dotenv.config();
// First config
import { App, AuthenticationSercice, logger, startWhenReady } from '@badvlasim/shared';
import { Router } from 'express';
import { JobController } from './controllers';

try {
  (async () => {
    logger.info('Starting server...');
    await startWhenReady(false, false, _ => {
      startServer();
      logger.info('Server started!');
    });
  })();
} catch (err) {
  logger.error(err);
}

const startServer = () => {
  const authService = new AuthenticationSercice();

  const app = new App([new JobController(Router(), authService.checkAuth)]);
  app.listen();
};
