import { APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { NgModule } from '@angular/core';
import { InMemoryCache, DefaultOptions, ApolloLink } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { AuthService } from '@auth0/auth0-angular';

import { lastValueFrom, take } from 'rxjs';
import { ConfigService } from '@badman/frontend/config';

export const apolloCache = new InMemoryCache({
  typePolicies: {
    GamePlayer: {
      keyFields: ['id', 'team', 'player'],
    },
    TeamPlayer: {
      // Not a "good" solution, but it works, and I'm tired
      keyFields: ['id', 'base'],
    },
  },
});

export function createApollo(
  httpLink: HttpLink,
  authService: AuthService,
  configService: ConfigService
) {
  const defaultOptions: DefaultOptions = {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      returnPartialData: true,
      // errorPolicy: 'ignore',
    },
    query: {
      // fetchPolicy: 'no-cache',
      // errorPolicy: 'all',
    },
  };

  const basic = setContext(() => ({
    headers: {
      Accept: 'charset=utf-8',
    },
  }));

  const auth = setContext(async (_, { headers }) => {
    const user = await lastValueFrom(
      authService.isAuthenticated$.pipe(take(1))
    );
    if (!user) {
      return { headers };
    }
    const token = await lastValueFrom(authService.getAccessTokenSilently());

    if (token === null) {
      return { headers };
    } else {
      return {
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
      };
    }
  });

  const link = ApolloLink.from([
    basic,
    auth,
    httpLink.create({ uri: configService.graphqlUrl }),
  ]);

  const options = {
    link,
    connectToDevTools: configService.isProduction,
    cache: apolloCache,
    defaultOptions,
  };

  return options;
}
@NgModule({
  exports: [],

  providers: [
    {
      provide: APOLLO_OPTIONS,
      useFactory: createApollo,
      deps: [HttpLink, AuthService, ConfigService],
    },
  ],
})
export class GraphQLModule {}
