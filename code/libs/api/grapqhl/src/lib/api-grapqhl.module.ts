import { ApiAuthorizationModule } from '@badman/api/authorization';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { BaseRedisCache } from 'apollo-server-cache-redis';
import * as Redis from 'ioredis';
import { join } from 'path';
import {
  ClubModule,
  CommentModule,
  EventModule,
  GameModule,
  PlayerModule,
  RankingModule,
  SecurityModule,
  TeamModule,
} from './resolvers';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      cache: new BaseRedisCache({
        client: new Redis({
          host: 'localhost',
          port: 6379,
        }),
      }),
      context: ({ request }) => {
        return { req: request };
      },
      /*
      cacheControl: {
          defaultMaxAge: 10000,
        },
       plugins: [responseCachePlugin()],
       */
    }),
    ApiAuthorizationModule,
    PlayerModule,
    TeamModule,
    ClubModule,
    CommentModule,
    RankingModule,
    EventModule,
    SecurityModule,
    GameModule,
  ],
  providers: [],
})
export class ApiGrapqhlModule {}
