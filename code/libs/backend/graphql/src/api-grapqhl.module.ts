import { ApiAuthorizationModule } from '@badman/backend-authorization';
import { ApolloDriver } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloServerPluginLandingPageLocalDefault } from 'apollo-server-core';
// import {
//   ApolloServerPlugin,
//   BaseContext,
//   GraphQLRequestContextDidResolveOperation,
// } from 'apollo-server-plugin-base';
import { join } from 'path';
import {
  AvailabilityModule,
  ClubResolverModule,
  CommentResolverModule,
  EventResolverModule,
  GameResolverModule,
  LocationResolverModule,
  PlayerResolverModule,
  RankingResolverModule,
  SecurityResolverModule,
  TeamResolverModule,
} from './resolvers';

@Module({
  imports: [
    GraphQLModule.forRoot({
      driver: ApolloDriver,
      playground: false,
      autoSchemaFile: join('schema/schema.gql'),
      csrfPrevention: true,
      cache: 'bounded',
      context: ({ request }) => {
        return { req: request };
      },
      plugins: [
        ApolloServerPluginLandingPageLocalDefault({ embed: true }),
      ],
    }),
    ApiAuthorizationModule,
    TeamResolverModule,
    ClubResolverModule,
    CommentResolverModule,
    RankingResolverModule,
    LocationResolverModule,
    AvailabilityModule,
    EventResolverModule,
    SecurityResolverModule,
    GameResolverModule,
    PlayerResolverModule,
  ],
})
export class ApiGrapqhlModule {}
