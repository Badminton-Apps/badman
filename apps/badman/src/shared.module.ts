import { provideHttpClient, withFetch } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { routes } from './app/app.routes';
import { GraphQLModule } from '@badman/frontend-modules-graphql';

// This module is imported on client, inside src/app/main.ts
// This module is imported on server, inside src/server/app.module.ts
// SharedModule provides AppService on client and server

@NgModule({
  imports: [
        GraphQLModule.forRoot({
      api: '/graphql',
    }),
  ],
  providers: [
    provideHttpClient(withFetch()),
    provideRouter(routes, withViewTransitions()),
  ],
})
export class SharedModule {}
