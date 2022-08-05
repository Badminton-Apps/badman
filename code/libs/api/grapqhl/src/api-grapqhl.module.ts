import { ApiAuthorizationModule } from '@badman/api/authorization';
import { ApolloDriver } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { BaseRedisCache } from 'apollo-server-cache-redis';
import {
  ApolloServerPluginCacheControl,
  ApolloServerPluginLandingPageLocalDefault,
} from 'apollo-server-core';
import {
  ApolloServerPlugin,
  BaseContext,
  GraphQLRequestContextDidResolveOperation,
} from 'apollo-server-plugin-base';
import apm from 'elastic-apm-node';
import Redis from 'ioredis';
import { join } from 'path';
import {
  AvailabilityModule,
  ClubModule,
  CommentModule,
  EventModule,
  GameModule,
  LocationModule,
  PlayerModule,
  RankingModule,
  SecurityModule,
  TeamModule,
} from './resolvers';
import responseCachePlugin from 'apollo-server-plugin-response-cache';

@Module({
  imports: [
    GraphQLModule.forRoot({
      driver: ApolloDriver,
      playground: false,
      autoSchemaFile: join('schema/schema.gql'),
      cache: 'bounded',
      context: ({ request }) => {
        return { req: request };
      },
      plugins: [
        responseCachePlugin({
          cache: new BaseRedisCache({
            client: new Redis({
              host: process.env.REDIS_HOST,
              port: parseInt(process.env.REDIS_PORT, 10),
              password: process.env.REDIS_PASSWORD,
              db: 1,
            }),
          }),
        }),
        ApolloServerPluginCacheControl({
          defaultMaxAge: 60,
          calculateHttpHeaders: true,
        }),
        ApolloServerPluginLandingPageLocalDefault(),
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
              },
            };
          },
        }),
      ],
    }),
    ApiAuthorizationModule,
    TeamModule,
    ClubModule,
    CommentModule,
    RankingModule,
    LocationModule,
    AvailabilityModule,
    EventModule,
    SecurityModule,
    GameModule,
    PlayerModule,
  ],
})
export class ApiGrapqhlModule {}
