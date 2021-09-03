// First config
import {
  App,
  AuthenticatedRequest,
  AuthenticationSercice,
  DataBaseHandler,
  NotificationService,
  PdfService,
  Player,
  startWhenReady
} from '@badvlasim/shared';
import 'apollo-cache-control';
import { ApolloServer } from 'apollo-server-express';
import dotenv from 'dotenv';
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

dotenv.config();

(async () => {
  await startWhenReady(true, false, db => {
    startServer(db);
  });
})();

const startServer = (databaseService: DataBaseHandler) => {
  const authService = new AuthenticationSercice();
  const pdfService = new PdfService(databaseService);
  const notifService = new NotificationService(databaseService);

  const app = new App(
    [
      new EnrollmentController(Router(), authService.checkAuth, databaseService, notifService),
      new RankingController(Router(), authService.checkAuth),
      new SystemController(Router(), authService.checkAuth, databaseService),
      new UserController(Router(), authService.checkAuth),
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
      }
    ]
  );

  const schema = createSchema(notifService);
  const apolloServer = new ApolloServer({
    context: async ({ req, res }: { req: AuthenticatedRequest; res: Response }) => {
      // When in dev we can allow graph playground to run without permission
      if (process.env.production === 'false') {
        // We can try to do the auth
        try {
          for (const check of authService.checkAuth) {
            await new Promise((resolve, reject) => {
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
              hasAnyPermission: (permissions: string[]) => {
                return true;
              },
              hasAllPermission: (permissions: string[]) => {
                return true;
              }
            }
          };
          return { req: grahpReq, res };
        }
      } else {
        for (const check of authService.checkAuth) {
          await new Promise((resolve, reject) => {
            check(req, res, () => {
              resolve(null);
            });
          });
        }
        return { req, res };
      }
    },
    schema,
    tracing: true,
    cacheControl: true,
    formatError: (err: GraphQLError) => ({
      message: err.originalError?.message || err.message,
      code: err.originalError?.code || 500
    })
  });

  apolloServer.applyMiddleware({
    app: app.app,
    cors: app.corsOptions,
    path: '/api/graphql'
  });

  app.listen();
};
