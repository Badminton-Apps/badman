// First config
import { App, AuthenticationSercice, startWhenReady } from '@badvlasim/shared';
import dotenv from 'dotenv';
import { Router } from 'express';
import { JobController } from './controllers';
dotenv.config();

(async () => {
  await startWhenReady(false, false, _ => {
    startServer();
  });
})();

const startServer = () => {
  const router = Router();
  const authService = new AuthenticationSercice();

  const app = new App([new JobController(router, authService.checkAuth)]);
  app.listen();
};
