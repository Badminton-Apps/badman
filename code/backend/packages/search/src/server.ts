// We need dontenv before App!!!
import dotenv from 'dotenv';
dotenv.config();

import apm, { AgentConfigOptions } from 'elastic-apm-node';

const apmConfig = {
  serviceName: process.env.SERVICE_NAME,
  serverUrl: process.env.APM_SERVER_URL,
  secretToken: process.env.APM_SERVER_TOKEN,
  verifyServerCert: false,
  active: process.env.APM_SERVER_ACTIVE === 'true' ?? true
} as AgentConfigOptions;

apm.start(apmConfig);

import { App, AuthenticationSercice, logger, startWhenReady } from '@badvlasim/shared';

import { Router } from 'express';
import { SearchController } from './controllers';

try {
  (async () => {
    try {
      logger.debug(`Started APM`, { data: apmConfig });
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

  const app = new App([new SearchController(Router(), authService.checkAuth)]);
  app.listen();
};
