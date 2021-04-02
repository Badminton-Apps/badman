import { NgModule } from '@angular/core';
import { InMemoryCache, DefaultOptions } from '@apollo/client/core';
import { APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink, HttpLinkModule } from 'apollo-angular-link-http';
import { environment } from './../environments/environment';

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

  const options = {
    link: httpLink.create({ uri }),
    connectToDevTools: environment.production == false,
    cache: new InMemoryCache({}) as any,
    defaultOptions,
  };

  return options;
}
@NgModule({
  exports: [HttpLinkModule],

  providers: [
    {
      provide: APOLLO_OPTIONS,
      useFactory: createApollo,
      deps: [HttpLink],
    },
  ],
})
export class GraphQLModule {}
