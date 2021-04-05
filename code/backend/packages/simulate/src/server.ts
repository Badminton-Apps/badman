// First config
import { App, AuthenticationSercice, DataBaseHandler, startWhenReady } from '@badvlasim/shared';
import dotenv from 'dotenv';
import { Router } from 'express';
import { SimulateController } from './controllers/simulate.controller';
import { RankingCalculator } from './models';
dotenv.config();

(async () => {
  await startWhenReady(false, false, db => {
    startServer(db);
  });
})();

const startServer = (databaseService: DataBaseHandler) => {
  const authService = new AuthenticationSercice();
  const calculator = new RankingCalculator(databaseService);
  const router = Router();

  const app = new App(process.env.PORT, [
    new SimulateController(router, authService.checkAuth, databaseService, calculator)
  ]);
  app.listen();
};
