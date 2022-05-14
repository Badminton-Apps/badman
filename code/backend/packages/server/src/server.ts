// We need dontenv before App!!!
import dotenv from 'dotenv';
dotenv.config();

import {
  App,
  AuthenticatedRequest,
  AuthenticationSercice,
  DataBaseHandler,
  logger,
  NotificationService,
  HandlebarService,
  Player,
  startWhenReady,
  SocketServer
} from '@badvlasim/shared';
import {
  ApolloServerPlugin,
  BaseContext,
  GraphQLRequestContextDidResolveOperation 
} from 'apollo-server-plugin-base';
import { ApolloServer } from 'apollo-server-express';
import { Response, Router } from 'express';
import {
  EnrollmentController,
  RankingController,
  RequestLinkController,
  UserController,
  PdfController,
  TestController 
} from './controllers';
import { createSchema } from './graphql/schema';
import { GraphQLError } from './models/graphql.error';
import graphqlCostAnalysis from 'graphql-cost-analysis';
import apm from 'elastic-apm-node';
 
const startServer = async (databaseService: DataBaseHandler) => {
  try {
    const authService = new AuthenticationSercice();
    const handlebarService = new HandlebarService();
    const notifService = new NotificationService(databaseService);

    const app = new App({
      controllers: [
        new EnrollmentController(Router(), authService.checkAuth, databaseService, notifService),
        new RankingController(Router(), authService.checkAuth),
        new UserController(Router(), authService.checkAuth, databaseService),
        new RequestLinkController(Router(), authService.checkAuth),
        new PdfController(Router(), handlebarService),
        new TestController(Router())
      ],
      proxies: [ 
        {
          from: '/api/v1/search',
          to: `http://${process.env.SEARCH_SERVICE}` 
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
    });

    // Setup socket.io
    await SocketServer.setup(app.httpServer, app.corsOptions);

    // Setup Apollo
    const schema = createSchema(notifService);
    const apolloServer = new CostAnalysisApolloServer({
      introspection: true,
      logger: logger,
      plugins: [
        // Add the operation name to transaction
        (): ApolloServerPlugin => ({
          async requestDidStart() {
            return {
              async didResolveOperation(
                context: GraphQLRequestContextDidResolveOperation<BaseContext>
              ) {
                apm.setTransactionName(
                  `${context?.operation?.operation?.toUpperCase()} ${
                    context.operation.name?.value ?? 'UNKOWN'
                  }`
                );
              }
            };
          }
        })
      ],
      context: async ({ req, res }: { req: AuthenticatedRequest; res: Response }) => {
        // When in dev we can allow graph playground to run without permission
        if (process.env.NODE_ENV === 'development') {
          // We can try to do the auth
          try {
            for (const check of authService.checkAuth) {
              await new Promise((resolve) => {
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
            await new Promise((resolve) => {
              check(req, res, () => {
                resolve(null);
              });
            });
          }
          return { req, res };
        }
      },
      schema,
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

    // Listen to everything
    app.listen();
  } catch (err) {
    logger.error('Something failed', err);
    throw err;
  }
};

try {
  (async () => {
    try {
      logger.info(`Starting ${process.env.SERVICE_NAME} version ${process.env.SERVICE_VERSION}`);
      await startWhenReady(true, false, (db) => startServer(db));
    } catch (e) {
      logger.error('Something failed', e);
      throw e;
    }
  })();
} catch (err) {
  logger.error('Something failed', err);
  throw err;
}

class CostAnalysisApolloServer extends ApolloServer {
  async createGraphQLServerOptions(req, res) {
    const options = await super.createGraphQLServerOptions(req, res);

    options.validationRules = options.validationRules ? options.validationRules.slice() : [];
    options.validationRules.push(
      graphqlCostAnalysis({
        variables: req.body.variables,
        maximumCost: 1000
      })
    );

    return options;
  }
}
