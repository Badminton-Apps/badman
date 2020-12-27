// First config
import {
  App,
  AuthenticationSercice,
  DataBaseHandler,
  logger,
  startWhenReady
} from '@badvlasim/shared';
import dotenv from 'dotenv';
import { Router } from 'express';
import { ImportController } from './controllers/import.controller';
import { Convertor } from './convert/convertor';
dotenv.config();

(async () => {
  await startWhenReady(false, db => {
    startServer(db);
  });
})();

const startServer = (databaseService: DataBaseHandler) => {
  const authService = new AuthenticationSercice();

  const router = Router();
  const authRouter = Router();
  const converter = new Convertor();

  authRouter.use(authService.checkAuth);

  const app = new App(process.env.PORT, [
    new ImportController(router, authRouter, databaseService, converter)
  ]);
  app.listen();
};
