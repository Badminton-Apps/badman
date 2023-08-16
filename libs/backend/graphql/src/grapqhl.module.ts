import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import { AuthorizationModule } from '@badman/backend-authorization';
import { ApolloDriver } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GqlModuleOptions, GraphQLModule } from '@nestjs/graphql';

import OperationRegistry from '@apollo/server-plugin-operation-registry';
import { ApolloServerPluginSchemaReporting } from '@apollo/server/plugin/schemaReporting';

import {
  AvailabilityModule,
  ClubResolverModule,
  CommentResolverModule,
  EventResolverModule,
  FaqResolverModule,
  GameResolverModule,
  LocationResolverModule,
  NotificationResolverModule,
  PlayerResolverModule,
  RankingResolverModule,
  SecurityResolverModule,
  TeamResolverModule,
} from './resolvers';

@Module({
  imports: [
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      useFactory: async () => {
        const plugins = [];

        if (process.env.NODE_ENV === 'development') {
          plugins.push(
            ApolloServerPluginLandingPageLocalDefault({ footer: false })
          );
        } else {
          plugins.push(
            ApolloServerPluginLandingPageProductionDefault({ footer: true })
          );
          plugins.push(ApolloServerPluginSchemaReporting());
          plugins.push(
            OperationRegistry({
              forbidUnregisteredOperations: true,
            })
          );
        }

        return {
          playground: false,
          debug: true,
          autoSchemaFile: true,
          context: ({ req }: { req: unknown }) => ({ req }),
          plugins,
        } as Omit<GqlModuleOptions, 'driver'>;
      },
    }),
    AuthorizationModule,
    TeamResolverModule,
    FaqResolverModule,
    ClubResolverModule,
    CommentResolverModule,
    RankingResolverModule,
    LocationResolverModule,
    AvailabilityModule,
    EventResolverModule,
    SecurityResolverModule,
    GameResolverModule,
    PlayerResolverModule,
    NotificationResolverModule,
  ],
})
export class GrapqhlModule {}
