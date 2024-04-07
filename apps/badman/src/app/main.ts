import { HttpClientModule } from '@angular/common/http';
import { APP_ID } from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AuthModule } from '@auth0/auth0-angular';
import { renderPage } from '@nitedani/vite-plugin-angular/client';
import { AppComponent } from '../app/app.component';
import { SharedModule } from '../shared.module';
renderPage({
  page: AppComponent,
  imports: [
    SharedModule,
    HttpClientModule,
    // GraphQLModule.forRoot({
    //   api: '/graphql',
    // }),
    AuthModule.forRoot({
      domain: import.meta.env.VITE_AUTH0_ISSUER_URL,
      clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
      useRefreshTokens: true,
      useRefreshTokensFallback: true,
      authorizationParams: {
        redirect_uri:
          typeof window !== 'undefined' ? window.location.origin : '',
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      },
      httpInterceptor: {
        allowedList: [
          {
            uriMatcher: (uri) => uri.indexOf('v1') > -1,
            allowAnonymous: true,
          },
        ],
      },
    }),
  ],
  providers: [
    provideAnimations(),
    { provide: APP_ID, useValue: import.meta.env.VITE_APP_ID },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline', subscriptSizing: 'dynamic' },
    },
  ],
});
