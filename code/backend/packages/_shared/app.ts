// import { typeDefs } from './schema';
import { logger } from '@badvlasim/shared';
import cors from 'cors';
import moment from 'moment';
import express, { Application, json } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { BaseController } from './models';
import { HealthController } from './controllers';
import { schedule } from 'node-cron';
import fetch from 'node-fetch';

moment.suppressDeprecationWarnings = true;

export class App {
  public app: Application;
  public corsOptions;

  constructor(
    controllers: BaseController[],
    proxies: { from: string; to: string }[] = []
  ) {
    this.app = express();

    this._initializeMiddlewares();
    this._initializeProxies(proxies);

    // place this after the proxies!!
    this.app.use(json());

    this._initializeControllers(controllers);
  }

  private async _startReportingService() {
    try {
      await fetch(`http://${process.env.REPORTING_SERVICE}/api/v1/status`, {
        method: 'POST',
        body: JSON.stringify({})
      });
    } catch {
      logger.warn('Scheduling service not online? retrying in 5 second');
      setTimeout(() => this._startReportingService(), 5000);
    }
  }

  private _initializeMiddlewares() {
    const whitelist = [
      'http://localhost:4000',
      'http://localhost:4200',
      'https://beta.latomme.org'
    ];
    this.corsOptions = {
      origin: (origin, callback) => {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
          callback(null, true);
        } else {
          callback(new Error(`${origin} not allowed by CORS`));
        }
      }
    } as cors.CorsOptions;

    this.app.use(cors(this.corsOptions));
  }

  private _initializeControllers(controllers: BaseController[]) {
    controllers.push(new HealthController());

    controllers.forEach(controller => {
      try {
        logger.debug(
          'Setting up controller',
          '/api/v1',
          controller.constructor.name
        );
        this.app.use('/api/v1', controller.router);
      } catch (error) {
        logger.error(`Error setting up ${controller.constructor.name}`, error);
        throw error;
      }
    });
  }

  private _initializeProxies(proxies) {
    proxies.forEach(p => {
      logger.debug('Setting up proxy', p.from, p.to);
      this.app.use(
        p.from,
        createProxyMiddleware({
          target: p.to,
          changeOrigin: true,
          ws: true,
          logLevel: 'debug'
        })
      );
    });
  }

  public listen(register = true) {
    this.app.listen(process.env.PORT, () => {
      logger.info(`🚀 App listening on the port ${process.env.PORT}`);

      if (register) {
        this._startReportingService();
      }
    });
  }
}
