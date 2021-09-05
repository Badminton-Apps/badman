import { start } from 'elastic-apm-node';
export const apm = process.env.NODE_ENV === 'test' ? null : start({
  logLevel: 'info',
  serviceName: process.env.SERVICE_NAME,
  serverUrl: process.env.APM_SERVER_URL,
  verifyServerCert: false
}); 


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
    this._list();
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
        logger.info(`🚀 ${process.env.SERVICE_NAME} listening on the port ${process.env.PORT}`);
        this._lightship.signalReady();
      })
      .on('error', e => {
        logger.error('Error', e);
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

  private _list() {
    const defaultOptions = {
      prefix: '',
      spacer: 7
    };

    const COLORS = {
      yellow: 33,
      green: 32,
      blue: 34,
      red: 31,
      grey: 90,
      magenta: 35,
      clear: 39
    };

    const spacer = x =>
      x > 0 ? [...new Array(x)].map(() => ' ').join('') : '';

    const colorText = (color: number, value: any) =>
      `\u001b[${color}m${value}\u001b[${COLORS.clear}m`;

    const colorMethod = (method: any) => {
      switch (method) {
        case 'POST':
          return colorText(COLORS.yellow, method);
        case 'GET':
          return colorText(COLORS.green, method);
        case 'PUT':
          return colorText(COLORS.blue, method);
        case 'DELETE':
          return colorText(COLORS.red, method);
        case 'PATCH':
          return colorText(COLORS.grey, method);
        default:
          return method;
      }
    };

    const getPathFromRegex = regexp => {
      return regexp
        .toString()
        .replace('/^', '')
        .replace('?(?=\\/|$)/i', '')
        .replace(/\\\//g, '/');
    };

    const combineStacks = (acc, stack) => {
      if (stack.handle.stack) {
        const routerPath = getPathFromRegex(stack.regexp);
        return [
          ...acc,
          ...stack.handle.stack.map(innerStack => ({
            routerPath,
            ...innerStack
          }))
        ];
      }
      return [...acc, stack];
    };

    const getStacks = app => {
      // Express 3
      if (app.routes) {
        // convert to express 4
        return Object.keys(app.routes)
          .reduce((acc, method) => [...acc, ...app.routes[method]], [])
          .map(route => ({ route: { stack: [route] } }));
      }

      /* eslint-disable no-underscore-dangle */
      // Express 4
      if (app._router && app._router.stack) {
        return app._router.stack.reduce(combineStacks, []);
      }
      /* eslint-enable no-underscore-dangle */

      // Express 4 Router
      if (app.stack) {
        return app.stack.reduce(combineStacks, []);
      }

      // Express 5
      if (app.router && app.router.stack) {
        return app.router.stack.reduce(combineStacks, []);
      }

      return [];
    };

    const expressListRoutes = (app, opts = null) => {
      const stacks = getStacks(app);
      const options = { ...defaultOptions, ...opts };

      if (stacks) {
        for (const stack of stacks) {
          if (stack.route) {
            const routeLogged = {};
            for (const route of stack.route.stack) {
              const method = route.method ? route.method.toUpperCase() : null;
              if (!routeLogged[method] && method) {
                const stackMethod = colorMethod(method);
                const stackSpace = spacer(options.spacer - method.length);
                const stackPath = [
                  options.prefix,
                  stack.routerPath,
                  stack.route.path,
                  route.path
                ]
                  .filter(s => !!s)
                  .join('');

                logger.debug(`${stackMethod}${stackSpace}${stackPath}`);
                routeLogged[method] = true;
              }
            }
          }
        }
      }
    };

    return expressListRoutes(this.app);
  }
}
