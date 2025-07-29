import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { inject, InjectionToken, Injector, isDevMode, PLATFORM_ID } from '@angular/core';
import { ApolloLink, InMemoryCache } from '@apollo/client/core';
import { loadDevMessages, loadErrorMessages } from '@apollo/client/dev';
import { setContext } from '@apollo/client/link/context';
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';
import { AuthService } from '@auth0/auth0-angular';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { sha256 } from 'crypto-hash';
import { lastValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

export const APOLLO_CACHE = new InjectionToken<InMemoryCache>('apollo-cache');
export const GRAPHQL_CONFIG_TOKEN = new InjectionToken<GraphqlConfiguration>('graphql.config');

export type GraphqlConfiguration = Readonly<{
  api: string;
  connectToDevTools?: boolean;
}>;

export function createApollo(
  httpLink: HttpLink,
  cache: InMemoryCache,
  injector: Injector,
  platformId: string,
  config: GraphqlConfiguration,
) {
  if (config.api === '') {
    throw new Error('GraphQL API URL is not set');
  }

  const basic = setContext(() => ({
    headers: {
      Accept: 'charset=utf-8',
    },
  }));

  const isBrowser = isPlatformBrowser(platformId);
  const isServer = isPlatformServer(platformId);

  const auth = setContext(async (_, { headers }) => {
    if (isBrowser) {
      const authService = injector.get(AuthService);
      const isAuthenticated = await lastValueFrom(authService.isAuthenticated$.pipe(take(1)));
      if (isAuthenticated) {
        const token = await lastValueFrom(authService.getAccessTokenSilently());
        if (token) {
          headers = {
            ...headers,
            Authorization: `Bearer ${token}`,
          };
        }
      }
    }

    return {
      headers: {
        ...headers,
        Accept: 'application/json; charset=utf-8',
        'X-App-Magic': '1',
      },
    };
  });

  if (isDevMode() || isServer) {
    console.log(`Setting up Apollo with API: ${config.api}`);
    loadDevMessages();
    loadErrorMessages();
  }

  const link = ApolloLink.from([
    basic,
    auth,
    httpLink.create({
      uri: config.api,
    }),
  ]);

  return {
    link: createPersistedQueryLink({ sha256 }).concat(link),
    persistedQueries: {
      ttl: 900, // 15 minutes
    },
    cache,
    connectToDevTools: config.connectToDevTools ?? true,
    ...(isBrowser
      ? {
          // queries with `forceFetch` enabled will be delayed
          ssrForceFetchDelay: 200,
        }
      : {
          // avoid to run twice queries with `forceFetch` enabled
          ssrMode: true,
        }),
  };
}

export function provideGraphQL(config: GraphqlConfiguration) {
  return [
    {
      provide: APOLLO_CACHE,
      useValue: new InMemoryCache({
        typePolicies: {
          GamePlayerMembershipType: {
            keyFields: ['id', 'team', 'player'],
          },
          ClubWithPlayerMembershipType: {
            keyFields: [['clubMembership', ['id']], 'id'],
          },
          ClubWithPlayers: {
            keyFields: [['clubMembership', ['id']], 'id'],
          },
          PlayerWithClubMembershipType: {
            keyFields: [['clubMembership', ['id']], 'id'],
          },
          PlayerWithTeamMembershipType: {
            keyFields: [['teamMembership', ['id']], 'id'],
          },
          PlayerTeam: {
            keyFields: [['teamMembership', ['id']], 'id'],
          },
          EntryCompetitionPlayersType: {
            keyFields: false,
          },
        },
      }),
    },
    { provide: GRAPHQL_CONFIG_TOKEN, useValue: config },
    provideHttpClient(withInterceptorsFromDi()),
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      const cache = inject(APOLLO_CACHE);
      const injector = inject(Injector);
      const platformId = inject(PLATFORM_ID) as string;
      const graphqlConfig = inject(GRAPHQL_CONFIG_TOKEN);

      return createApollo(httpLink, cache, injector, platformId, graphqlConfig);
    }),
  ];
}
