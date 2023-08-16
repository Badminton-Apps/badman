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
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const plugins = [];

        if (process.env.NODE_ENV === 'development') {
          plugins.push(
            ApolloServerPluginLandingPageLocalDefault({ footer: false })
          );
        } else {
          plugins.push(
            ApolloServerPluginLandingPageProductionDefault({
              graphRef: config.get<string>('APOLLO_GRAPH_REF'),
              footer: true,
            })
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
