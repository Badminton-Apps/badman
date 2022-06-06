import { ApiAuthorizationModule } from '@badman/api/authorization';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { BaseRedisCache } from 'apollo-server-cache-redis';
import {
  ApolloServerPlugin,
  BaseContext,
  GraphQLRequestContextDidResolveOperation,
} from 'apollo-server-plugin-base';
import * as Redis from 'ioredis';
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
import * as apm from 'elastic-apm-node';
import { ApolloServerPluginLandingPageLocalDefault } from 'apollo-server-core';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: false,
      autoSchemaFile: join('schema/schema.gql'),
      cache: new BaseRedisCache({
        client: new Redis({
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT, 10),
        }),
      }),
      context: ({ request }) => {
        return { req: request };
      },
      plugins: [
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
    PlayerModule,
    TeamModule,
    ClubModule,
    CommentModule,
    RankingModule,
    LocationModule,
    AvailabilityModule,
    EventModule,
    SecurityModule,
    GameModule,
  ],
  providers: [],
})
export class ApiGrapqhlModule {}
