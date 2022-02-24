// We need dontenv before App!!!
import dotenv from 'dotenv';
dotenv.config();

import {
  App,
  AuthenticationSercice,
  SocketListener,
  logger,
  startWhenReady
} from '@badvlasim/shared';

import { Router } from 'express';
import { SearchController } from './controllers';

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
const startServer = async () => {
  const authService = new AuthenticationSercice();

  const app = new App({
    controllers: [new SearchController(Router(), authService.checkAuth)]
  });
 
  // Setup socket.io
  await SocketListener.setup([
    // {
    //   name: EVENTS.JOB.CRON_STARTED,
    //   handler: async (data) => {
    //     logger.debug(`Received event ${EVENTS.JOB.CRON_STARTED}`, { data });
    //   }
    // },
    // {
    //   name: EVENTS.JOB.CRON_UPDATE,
    //   handler: async (data) => {
    //     logger.debug(`Received event ${EVENTS.JOB.CRON_UPDATE}`, { data });
    //   }
    // },
    // {
    //   name: EVENTS.JOB.CRON_FINISHED,
    //   handler: async (data) => {
    //     logger.debug(`Received event ${EVENTS.JOB.CRON_FINISHED}`, { data });
    //   }
    // }
  ]);
 
  app.listen();
};
