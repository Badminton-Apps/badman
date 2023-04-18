import { isDevMode, NgModule, SecurityContext } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router';
import { GraphQLModule } from '@badman/frontend-graphql';
import {
  ClarityModule,
  GoogleAdsModule,
  GoogleAnalyticsModule,
  VERSION_INFO,
} from '@badman/frontend-html-injects';
import { JobsModule } from '@badman/frontend-jobs';

import { HttpClient } from '@angular/common/http';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { PdfModule } from '@badman/frontend-pdf';

import { SeoModule } from '@badman/frontend-seo';
import { TranslationModule } from '@badman/frontend-translation';
import { AnalyticsModule } from '@badman/frontend-vitals';
import { NgMapsCoreModule } from '@ng-maps/core';
import { GOOGLE_MAPS_API_CONFIG, NgMapsGoogleModule } from '@ng-maps/google';
import { NgMapsPlacesModule } from '@ng-maps/places';
import { MarkdownModule } from 'ngx-markdown';
import { QuillModule } from 'ngx-quill';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';

// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { RANKING_CONFIG } from '@badman/frontend-ranking';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { AuthModule } from '@badman/frontend-auth';
import { ShellComponent } from '@badman/frontend-components';

const APP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@badman/frontend-components').then((m) => m.LandingComponent),
  },
  {
    path: 'club',
    loadChildren: () =>
      import('@badman/frontend-club').then((m) => m.ClubModule),
  },
  {
    path: 'player',
    loadChildren: () =>
      import('@badman/frontend-player').then((m) => m.PlayerModule),
  },
  {
    path: 'ranking',
    loadChildren: () =>
      import('@badman/frontend-ranking').then((m) => m.RankingModule),
  },
  {
    path: 'competition',
    loadChildren: () =>
      import('@badman/frontend-competition').then((m) => m.CompetitionModule),
  },
  {
    path: 'tournament',
    loadChildren: () =>
      import('@badman/frontend-tournament').then((m) => m.TournamentModule),
  },
  {
    path: 'notifications',
    loadChildren: () =>
      import('@badman/frontend-notifications').then(
        (m) => m.NotificationsModule
      ),
  },
  {
    path: 'general',
    loadChildren: () =>
      import('@badman/frontend-general').then((m) => m.GeneralModule),
  },
];
@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule.withServerTransition({ appId: 'badman' }),
    GraphQLModule.forRoot({
      api: environment.graphql,
    }),
    RouterModule.forRoot(APP_ROUTES),
    AuthModule.forRoot({
      domain: 'badvlasim.eu.auth0.com',
      clientId: '2LqkYZMbrTTXEE0OMkQJLmpRrOVQheoF',
      useRefreshTokens: true,
      useRefreshTokensFallback: true,
      authorizationParams: {
        redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
        audience: 'ranking-simulation',
      },
    }),
    BrowserAnimationsModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000',
    }),
    SeoModule.forRoot({
      siteName: 'Badminton',
      siteUrl: 'https://badman.app',
      imageEndpoint: `${environment.api}/${environment.apiVersion}/image`,
    }),
    ClarityModule.forRoot({
      enabled: environment.production,
      ...environment.clarity,
    }),
    GoogleAdsModule.forRoot({
      enabled: environment.production,
      ...environment.google.ads,
      scriptType: 'text/javascript',
    }),
    GoogleAnalyticsModule.forRoot({
      enabled: environment.production,
      ...environment.google.analytics,
    }),
    PdfModule.forRoot({
      api: `${environment.api}/${environment.apiVersion}/pdf`,
    }),
    TranslationModule.forRoot({
      api: `${environment.api}/${environment.apiVersion}/translate/i18n/`,
    }),
    MarkdownModule.forRoot({
      loader: HttpClient,
      sanitize: SecurityContext.NONE,
    }),
    AnalyticsModule.forRoot({
      ...environment.vitals,
    }),
    JobsModule.forRoot({
      api: `${environment.api}/${environment.apiVersion}`,
    }),
    QuillModule.forRoot(),
    NgMapsCoreModule,
    NgMapsGoogleModule,
    NgMapsPlacesModule.forRoot({ autocomplete: {} }),
    ShellComponent,
  ],
  providers: [
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline' },
    },

    {
      provide: VERSION_INFO,
      useValue: {
        version: environment.version ?? '0.0.0',
        beta: environment.beta ?? false,
      },
    },
    {
      provide: RANKING_CONFIG,
      useValue: {
        api: `${environment.api}/${environment.apiVersion}/ranking`,
      },
    },
    {
      provide: GOOGLE_MAPS_API_CONFIG,
      useValue: {
        apiKey: 'AIzaSyBTWVDWCw6c3rnZGG4GQcvoOoLuonsLuLc',
        libraries: ['places'],
      },
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
