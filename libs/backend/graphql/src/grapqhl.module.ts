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
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting';

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
import { ServiceResolverModule } from './resolvers/services/serice.module';
import { CronJobResolverModule } from './resolvers/cronJobs/cronJob.module';
import { ConfigType } from '@badman/utils';

@Module({
  imports: [
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService<ConfigType>) => {
        const plugins = [];

        if (process.env.NODE_ENV !== 'production') {
          plugins.push(
            ApolloServerPluginLandingPageLocalDefault({ footer: false }),
          );
        } else if (process.env.NODE_ENV === 'production') {
          plugins.push(
            ApolloServerPluginLandingPageProductionDefault({
              graphRef: config.get<string>('APOLLO_GRAPH_REF'),
              footer: true,
            }),
          );
          plugins.push(ApolloServerPluginSchemaReporting());
          plugins.push(
            OperationRegistry({
              forbidUnregisteredOperations: true,
            }),
          );
          plugins.push(
            ApolloServerPluginUsageReporting({
              sendVariableValues: { all: true },
            }),
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
    ServiceResolverModule,
    CronJobResolverModule,
  ],
})
export class GrapqhlModule {}
