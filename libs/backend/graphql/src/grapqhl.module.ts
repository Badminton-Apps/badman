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

import { ConfigType } from '@badman/utils';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'node:path';
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
import { CronJobResolverModule } from './resolvers/cronJobs/cronJob.module';
import { ServiceResolverModule } from './resolvers/services/serice.module';

@Module({
  imports: [
    GraphQLModule.forRootAsync({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService<ConfigType>) => {
        const plugins = [];
        const env = config.get<string>('NODE_ENV');

        if (env !== 'production') {
          plugins.push(ApolloServerPluginLandingPageLocalDefault({ footer: false }));
        } else if (env === 'production') {
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
          cors: {
            origin: '*',
          },
          playground: false,
          debug: true,
          autoSchemaFile: join(process.cwd(), 'schema.gql'),
          context: ({ req }: { req: unknown }) => ({ req }),
          plugins,
          // Add query complexity and depth limits
          validationRules: [
            // Limit query depth to prevent deep nested queries
            {
              ValidationError: (context: any) => {
                const maxDepth = 10;
                const depth = getQueryDepth(context.document);
                if (depth > maxDepth) {
                  return new Error(`Query depth ${depth} exceeds maximum of ${maxDepth}`);
                }
              },
            },
            // Limit query complexity
            {
              ValidationError: (context: any) => {
                const maxComplexity = 1000;
                const complexity = calculateQueryComplexity(context.document);
                if (complexity > maxComplexity) {
                  return new Error(
                    `Query complexity ${complexity} exceeds maximum of ${maxComplexity}`,
                  );
                }
              },
            },
          ],
          // Add response size limits
          formatError: (error: any) => {
            // Log large responses
            if (error.extensions?.responseSize > 1000000) {
              // 1MB
              console.warn('Large GraphQL response detected:', error.extensions.responseSize);
            }
            return error;
          },
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

// Helper function to calculate query depth
function getQueryDepth(document: any, depth = 0): number {
  if (!document || !document.definitions) return depth;

  let maxDepth = depth;
  for (const definition of document.definitions) {
    if (definition.selectionSet) {
      maxDepth = Math.max(maxDepth, getSelectionSetDepth(definition.selectionSet, depth));
    }
  }
  return maxDepth;
}

function getSelectionSetDepth(selectionSet: any, depth: number): number {
  if (!selectionSet || !selectionSet.selections) return depth;

  let maxDepth = depth;
  for (const selection of selectionSet.selections) {
    if (selection.selectionSet) {
      maxDepth = Math.max(maxDepth, getSelectionSetDepth(selection.selectionSet, depth + 1));
    }
  }
  return maxDepth;
}

// Helper function to calculate query complexity
function calculateQueryComplexity(document: any): number {
  if (!document || !document.definitions) return 0;

  let complexity = 0;
  for (const definition of document.definitions) {
    if (definition.selectionSet) {
      complexity += calculateSelectionSetComplexity(definition.selectionSet);
    }
  }
  return complexity;
}

function calculateSelectionSetComplexity(selectionSet: any): number {
  if (!selectionSet || !selectionSet.selections) return 0;

  let complexity = 0;
  for (const selection of selectionSet.selections) {
    // Base complexity for each field
    complexity += 1;

    // Additional complexity for nested selections
    if (selection.selectionSet) {
      complexity += calculateSelectionSetComplexity(selection.selectionSet);
    }

    // Higher complexity for list fields
    if (selection.name?.value?.includes('list') || selection.name?.value?.includes('all')) {
      complexity += 5;
    }
  }
  return complexity;
}
