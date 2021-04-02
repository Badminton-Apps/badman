// First config
import {
  App,
  AuthenticatedRequest,
  AuthenticationSercice,
  DataBaseHandler,
  startWhenReady
} from '@badvlasim/shared';
import 'apollo-cache-control';
import { ApolloServer } from 'apollo-server-express';
import dotenv from 'dotenv';
import { Response, Router } from 'express';
import { RankingController } from './controllers/ranking.controller';
import { RequestLinkController } from './controllers/request-link.controller';
import { SystemController } from './controllers/system.controller';
// Then  rest
import { UserController } from './controllers/user.controller';
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

  const router = Router();
  const authRouter = Router();

  authRouter.use(authService.checkAuth);

  const app = new App(
    process.env.PORT,
    [
      new RankingController(router, authRouter),
      new SystemController(router, authRouter, databaseService),
      new UserController(router, authRouter),
      new RequestLinkController(router, authRouter)
    ],
    [
      {
        from: '/api/v1/import',
        to: process.env.IMPORT_SERVICE
      },
      {
        from: '/api/v1/simulate',
        to: process.env.SIMULATE_SERVICE
      }
    ]
  );

  const schema = createSchema();
  const apolloServer = new ApolloServer({
    context: async ({ req, res }: { req: AuthenticatedRequest; res: Response }) => {
      // When in dev we can allow graph playground to run without permission
      if (process.env.production === 'false') {
        const grahpReq = {
          ...req,
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
      } else {
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
