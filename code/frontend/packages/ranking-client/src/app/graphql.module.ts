import { NgModule } from '@angular/core';
import { ApolloModule, APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink, HttpLinkModule } from 'apollo-angular-link-http';
import { InMemoryCache, defaultDataIdFromObject } from 'apollo-cache-inmemory';
import { environment } from './../environments/environment';
import { DefaultOptions } from 'apollo-client';

const uri = `${environment.api}/graphql`;
export function createApollo(httpLink: HttpLink) {
  const defaultOptions: DefaultOptions = {
    watchQuery: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'ignore',
    },
    query: {
      fetchPolicy: 'no-cache',
      errorPolicy: 'all',
    },
  };

  return {
    link: httpLink.create({ uri }),
    cache: new InMemoryCache({
      dataIdFromObject: (object: any) => {
        switch (object.__typename) {
          case 'GamePlayer':
            return `gamePlayer${object.id}_${object.player}${object.team}`;
          default:
            return defaultDataIdFromObject(object); // fall back to default handling
        }
      },
    }),
    defaultOptions,
  };
}
@NgModule({
  exports: [ApolloModule, HttpLinkModule],

  providers: [
    {
      provide: APOLLO_OPTIONS,
      useFactory: createApollo,
      deps: [HttpLink],
    },
  ],
})
export class GraphQLModule {}
