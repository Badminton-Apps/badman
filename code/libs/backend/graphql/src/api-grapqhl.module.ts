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
      // cache: GRAPHQL_CACHE,
      cache: 'bounded',
      context: ({ request }) => {
        return { req: request };
      },
      plugins: [
        // responseCachePlugin({
        //   cache: GRAPHQL_CACHE,
        // }),
        // ApolloServerPluginCacheControl({
        //   defaultMaxAge: 600,
        //   calculateHttpHeaders: true,
        // }),
        ApolloServerPluginLandingPageLocalDefault({ embed: true }),
        // Add the operation name to transaction
        // (): ApolloServerPlugin => ({
        //   async requestDidStart() {
        //     return {
        //       async didResolveOperation(
        //         context: GraphQLRequestContextDidResolveOperation<BaseContext>
        //       ) {
        //         apm.setTransactionName(
        //           `${context?.operation?.operation?.toUpperCase()} ${
        //             context.operation.name?.value ?? 'UNKOWN'
        //           }`
        //         );
        //       },
        //     };
        //   },
        // }),
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
