// We need dontenv before App!!!
import dotenv from 'dotenv';
dotenv.config();
// First config
import { App, AuthenticationSercice, startWhenReady } from '@badvlasim/shared';
import { Router } from 'express';
import { JobController } from './controllers';

(async () => {
  await startWhenReady(false, false, _ => {
    startServer();
  });
})();

const startServer = () => {
  const authService = new AuthenticationSercice();

  const app = new App([new JobController(Router(), authService.checkAuth)]);
  app.listen();
};
