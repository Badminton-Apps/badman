import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from "@apollo/server/plugin/landingPage/default";
import { AuthorizationModule } from "@badman/backend-authorization";
import { ApolloDriver } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { GqlModuleOptions, GraphQLModule } from "@nestjs/graphql";

import OperationRegistry from "@apollo/server-plugin-operation-registry";
import { ApolloServerPluginSchemaReporting } from "@apollo/server/plugin/schemaReporting";
import { ApolloServerPluginUsageReporting } from "@apollo/server/plugin/usageReporting";

import { ConfigType } from "@badman/utils";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { join } from "node:path";
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
} from "./resolvers";
import { CronJobResolverModule } from "./resolvers/cronJobs/cronJob.module";
import { ServiceResolverModule } from "./resolvers/services/serice.module";

@Module({
  imports: [
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService<ConfigType>) => {
        const plugins = [];
        const env = config.get<string>("NODE_ENV");

        if (env !== "production") {
          plugins.push(ApolloServerPluginLandingPageLocalDefault({ footer: false }));
        } else if (env === "production") {
          plugins.push(
            ApolloServerPluginLandingPageProductionDefault({
              graphRef: config.get<string>("APOLLO_GRAPH_REF"),
              footer: true,
            })
          );
          plugins.push(ApolloServerPluginSchemaReporting());
          plugins.push(
            OperationRegistry({
              forbidUnregisteredOperations: true,
            })
          );
          plugins.push(
            ApolloServerPluginUsageReporting({
              sendVariableValues: { all: true },
            })
          );
        }

        return {
          cors: {
            origin: "*",
          },
          playground: false,
          debug: true,
          autoSchemaFile: join(process.cwd(), "schema.gql"),
          context: ({ req }: { req: unknown }) => ({ req }),
          plugins,
        } as Omit<GqlModuleOptions, "driver">;
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
