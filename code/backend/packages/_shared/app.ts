// import { typeDefs } from './schema';
import { logger } from '@badvlasim/shared';
import cors from 'cors';
import moment from 'moment';
import express, { Application, json } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { BaseController } from './models';

moment.suppressDeprecationWarnings = true;

export class App {
  public app: Application;
  public port: number;
  public corsOptions;

  constructor(
    port: string,
    controllers: BaseController[],
    proxies: { from: string; to: string }[] = []
  ) {
    this.app = express();
    this.port = parseInt(port, 10);

    this._initializeMiddlewares();
    this._initializeProxies(proxies);

    // place this after the proxies!!
    this.app.use(json());

    this._initializeControllers(controllers) ;
  }

  private _initializeMiddlewares() {
    const whitelist = [
      'http://localhost:4000',
      'http://localhost:4200',
      'https://badvlasim.westeurope.cloudapp.azure.com'
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

        // if auth routes get those
        if (controller.authRouter) {
          this.app.use('/api/v1', controller.authRouter);
        }
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
          // logProvider: provider => {
          //   const myCustomProvider = {
          //     log: logger.log,
          //     debug: logger.debug,
          //     info: logger.info,
          //     warn: logger.warn,
          //     error: logger.error
          //   };
          //   return myCustomProvider;
          // }
        })
      );
    });
  }

  public listen() {
    this.app.listen(this.port, () => {
      logger.info(`App listening on the port ${this.port}`);
    });
  }
}
