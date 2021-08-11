// import { typeDefs } from './schema';
import { logger } from '@badvlasim/shared';
import cors from 'cors';
import moment from 'moment';
import express, { Application, json } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { BaseController } from './models';
import { createLightship, Lightship } from 'lightship';

moment.suppressDeprecationWarnings = true;

export class App {
  public app: Application;
  public corsOptions;
  private _lightship: Lightship;

  constructor(
    controllers: BaseController[],
    proxies: { from: string; to: string }[] = []
  ) {
    this.app = express();
    this._lightship = createLightship(); 

    this._initializeMiddlewares();
    this._initializeProxies(proxies);

    // place this after the proxies!!
    this.app.use(json());

    this._initializeControllers(controllers);
  }

  private _initializeMiddlewares() {
    const whitelist = [
      'http://localhost:5000',
      'http://localhost:4000',
      'http://localhost:4200',
      'https://beta.latomme.org',
      'https://badman.app'
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

  public listen() {
    const httpServer = this.app
      .listen(process.env.PORT, () => {
        logger.info(`🚀 App listening on the port ${process.env.PORT}`);
        this._lightship.signalReady();
      })
      .on('error', () => {
        this._lightship.shutdown();
      });

    [
      `exit`,
      `SIGINT`,
      `SIGUSR1`,
      `SIGUSR2`,
      `uncaughtException`,
      `SIGTERM`
    ].forEach(event => {
      process.on(event, () => {
        logger.info('Process event type: ', event);
        httpServer.close();
        process.exit();
      });
    });

    this._lightship.registerShutdownHandler(() => {
      httpServer.close();
    });
  }
}
