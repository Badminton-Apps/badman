import { APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { NgModule } from '@angular/core';
import { InMemoryCache, DefaultOptions } from '@apollo/client/core';

import { environment } from './../environments/environment';

const uri = `${environment.api}/graphql`;
export const cache = new InMemoryCache({
  typePolicies: {
    GamePlayer: {
      keyFields: ['id', 'team', 'player'],
    },
  },
});

export function createApollo(httpLink: HttpLink) {
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

  const options = {
    link: httpLink.create({ uri }),
    connectToDevTools: environment.production == false,
    cache,
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
      deps: [HttpLink],
    },
  ],
})
export class GraphQLModule {}
