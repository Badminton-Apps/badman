import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import { AuthorizationModule } from '@badman/backend-authorization';
import { ApolloDriver } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GqlModuleOptions, GraphQLModule } from '@nestjs/graphql';

import OperationRegistry from '@apollo/server-plugin-operation-registry';

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
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          playground: false,
          debug: true,
          autoSchemaFile: true,
          context: ({ req }: { req: any }) => ({ req }),
          plugins: [
            OperationRegistry({
              forbidUnregisteredOperations: true,
            }),
            // Install a landing page plugin based on NODE_ENV
            process.env.NODE_ENV === 'production'
              ? ApolloServerPluginLandingPageProductionDefault({
                  graphRef: configService.get('GRAPH_REF'),
                  footer: false,
                })
              : ApolloServerPluginLandingPageLocalDefault({ footer: true }),
          ],
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
