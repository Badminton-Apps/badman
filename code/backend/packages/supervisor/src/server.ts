import { Router } from 'express';
import { StatusController } from './controllers/status.controller';
// First config
import { App } from '@badvlasim/shared';
import dotenv from 'dotenv';
dotenv.config();

const startServer = () => {
  const router = Router();
  const app = new App([new StatusController(router)]);
  app.listen(false);
};

(async () => {
  startServer();
})();
