// We need dontenv before App!!!
import dotenv from 'dotenv';
dotenv.config();
import pkg from '../package.json'

// First config
import { App, AuthenticationSercice, logger, startWhenReady } from '@badvlasim/shared';
import { Router } from 'express';
import { SimulateController } from './controllers/simulate.controller';
import { RankingCalculator } from './models';

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
  const calculator = new RankingCalculator();

  const app = new App([
    new SimulateController(Router(), authService.checkAuth, calculator)
  ]);
  app.listen();
};
