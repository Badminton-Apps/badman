// We need dontenv before App!!!
import dotenv from 'dotenv';
dotenv.config();
import pkg from '../package.json'

import {
  App,
  AuthenticatedRequest,
  AuthenticationSercice,
  DataBaseHandler,
  logger,
  NotificationService,
  PdfService,
  Player,
  startWhenReady
} from '@badvlasim/shared';

import 'apollo-cache-control';
import { ApolloServer } from 'apollo-server-express';
import { Response, Router } from 'express';
import {
  EnrollmentController,
  RankingController,
  RequestLinkController,
  SystemController,
  UserController,
  PdfController
} from './controllers';
import { createSchema } from './graphql/schema';
import { GraphQLError } from './models/graphql.error';

try {
  (async () => {
    try {
      logger.info(`Starting ${process.env.SERVICE_NAME} version ${pkg.version}`);
      await startWhenReady(true, false, db => startServer(db));
    } catch (e) {
      logger.error('Something failed', e);
      throw e;
    }
  })();
} catch (err) {
  logger.error('Something failed', err);
  throw err;
}

const startServer = async (databaseService: DataBaseHandler) => {
  const authService = new AuthenticationSercice();
  const pdfService = new PdfService();
  const notifService = new NotificationService(databaseService); 

  const app = new App(
    [
      new EnrollmentController(Router(), authService.checkAuth, databaseService, notifService),
      new RankingController(Router(), authService.checkAuth),
      new SystemController(Router(), authService.checkAuth, databaseService),
      new UserController(Router(), authService.checkAuth, databaseService),
      new RequestLinkController(Router(), authService.checkAuth),
      new PdfController(Router(), pdfService)
    ],
    [
      {
        from: '/api/v1/import',
        to: `http://${process.env.IMPORT_SERVICE}`
      },
      {
        from: '/api/v1/simulate',
        to: `http://${process.env.SIMULATE_SERVICE}`
      },
      {
        from: '/api/v1/job',
        to: `http://${process.env.JOB_SERVICE}`
      }
    ]
  );

  const schema = createSchema(notifService);
  const apolloServer = new ApolloServer({
    context: async ({ req, res }: { req: AuthenticatedRequest; res: Response }) => {
      // When in dev we can allow graph playground to run without permission
      if (process.env.NODE_ENV === 'development') {
        // We can try to do the auth
        try {
          for (const check of authService.checkAuth) {
            await new Promise((resolve, ) => {
              check(req, res, () => {
                resolve(null);
              });
            });
          }
          return { req, res };
        } catch (err) {
          // But if we fail we can just return a default setting
          const grahpReq = {
            ...req,
            player: await Player.findOne({ where: { memberId: '50104197' } }),
            user: {
              ...req.user,
              hasAnyPermission: () => {
                return true;
              },
              hasAllPermission: () => {
                return true;
              }
            }
          };
          return { req: grahpReq, res };
        }
      } else {
        for (const check of authService.checkAuth) {
          await new Promise((resolve, ) => {
            check(req, res, () => {
              resolve(null);
            });
          });
        }
        return { req, res };
      } 
    },
    schema,
    // tracing: true,
    // cacheControl: true,
    formatError: (err: GraphQLError) => ({
      message: err.originalError?.message || err.message,
      code: err.originalError?.code || 500
    })
  });

  await apolloServer.start();

  apolloServer.applyMiddleware({
    app: app.app,
    cors: app.corsOptions,
    path: '/api/graphql'
  });

  app.listen();
};
