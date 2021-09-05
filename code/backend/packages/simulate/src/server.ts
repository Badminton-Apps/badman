// We need dontenv before App!!!
import dotenv from 'dotenv';
dotenv.config();

// First config
import { App, AuthenticationSercice, DataBaseHandler, startWhenReady } from '@badvlasim/shared';
import { Router } from 'express';
import { SimulateController } from './controllers/simulate.controller';
import { RankingCalculator } from './models';

(async () => {
  await startWhenReady(false, false, db => {
    startServer(db);
  });
})();

const startServer = (databaseService: DataBaseHandler) => {
  const authService = new AuthenticationSercice();
  const calculator = new RankingCalculator(databaseService);

  const app = new App([
    new SimulateController(Router(), authService.checkAuth, databaseService, calculator)
  ]);
  app.listen();
};
