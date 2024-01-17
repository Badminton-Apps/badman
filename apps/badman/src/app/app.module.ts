import { APP_ID, inject, isDevMode, NgModule, SecurityContext } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule, Routes } from '@angular/router';
import { GraphQLModule } from '@badman/frontend-graphql';

import {
  ClarityModule,
  GoogleAdsModule,
  GoogleAnalyticsModule,
  GoogleMapsModule,
  VERSION_INFO,
} from '@badman/frontend-html-injects';

import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AuthModule } from '@badman/frontend-auth';
import { CpModule } from '@badman/frontend-cp';
import { PdfModule } from '@badman/frontend-pdf';
import { SeoModule } from '@badman/frontend-seo';
import { TranslationModule } from '@badman/frontend-translation';
import { TwizzitModule } from '@badman/frontend-twizzit';
import { AnalyticsModule } from '@badman/frontend-vitals';
import { NgMapsCoreModule } from '@ng-maps/core';
import { GOOGLE_MAPS_API_CONFIG, NgMapsGoogleModule } from '@ng-maps/google';
import { NgMapsPlacesModule } from '@ng-maps/places';
import { MarkdownModule } from 'ngx-markdown';
import { QuillModule } from 'ngx-quill';
import { environment } from '../environments/environment';
import { AppComponent } from './app.component';

import { ExcelModule } from '@badman/frontend-excel';
import { Socket, SocketIoModule } from 'ngx-socket-io';

/*  eslint-disable @nx/enforce-module-boundaries*/
import { ShellComponent } from '@badman/frontend-components';
import { JOBS_CONFIG_TOKEN } from '@badman/frontend-queue';
import { RANKING_CONFIG } from '@badman/frontend-ranking';
/*  eslint-enable @nx/enforce-module-boundaries */

const APP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('@badman/frontend-components').then((m) => m.LandingComponent),
    data: {
      animation: 'landing',
    },
  },
  {
    path: 'policy',
    loadComponent: () => import('@badman/frontend-components').then((m) => m.PrivacyPolicyComponent),
    data: {
      animation: 'landing',
    },
  },
  {
    path: 'club',
    loadChildren: () => import('@badman/frontend-club').then((m) => m.ClubModule),
    data: {
      animation: 'club',
    },
  },
  {
    path: 'player',
    loadChildren: () => import('@badman/frontend-player').then((m) => m.PlayerModule),
    data: {
      animation: 'player',
    },
  },
  {
    path: 'ranking',
    loadChildren: () => import('@badman/frontend-ranking').then((m) => m.RankingModule),
    data: {
      animation: 'ranking',
    },
  },
  {
    path: 'competition',
    loadChildren: () => import('@badman/frontend-competition').then((m) => m.CompetitionModule),
    data: {
      breadcrumb: 'all.competition.title',
    },
  },
  {
    path: 'tournament',
    loadChildren: () => import('@badman/frontend-tournament').then((m) => m.TournamentModule),
    data: {
      breadcrumb: 'all.tournament.title',
    },
  },
  {
    path: 'notifications',
    loadChildren: () => import('@badman/frontend-notifications').then((m) => m.NotificationsModule),
  },
  {
    path: 'general',
    loadChildren: () => import('@badman/frontend-general').then((m) => m.GeneralModule),
  },
  {
    path: 'jobs',
    loadChildren: () => import('@badman/frontend-jobs').then((m) => m.JobModule),
  },
];
@NgModule({
  declarations: [AppComponent],
  imports: [
    HttpClientModule,
    BrowserAnimationsModule,
    BrowserModule,
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
      httpInterceptor: {
        allowedList: [
          {
            uriMatcher: (uri) => uri.indexOf('v1') > -1,
            allowAnonymous: true,
          },
        ],
      },
    }),
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
    ExcelModule.forRoot({
      api: `${environment.api}/${environment.apiVersion}/excel`,
    }),
    TwizzitModule.forRoot({
      api: `${environment.api}/${environment.apiVersion}/twizzit`,
    }),
    CpModule.forRoot({
      api: `${environment.api}/${environment.apiVersion}/cp`,
    }),
    SocketIoModule.forRoot({
      url: `${environment.api}`,
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
    QuillModule.forRoot(),
    NgMapsCoreModule,
    NgMapsGoogleModule,
    NgMapsPlacesModule.forRoot({ autocomplete: {} }),
    ShellComponent,
    GoogleMapsModule,
  ],
  providers: [
    { provide: APP_ID, useValue: 'badman' },

    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline', subscriptSizing: 'dynamic' },
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
      provide: JOBS_CONFIG_TOKEN,
      useValue: {
        api: `${environment.api}/${environment.apiVersion}`,
      },
    },
    {
      provide: GOOGLE_MAPS_API_CONFIG,
      useValue: {
        apiKey: 'AIzaSyBTWVDWCw6c3rnZGG4GQcvoOoLuonsLuLc',
        libraries: ['places'],
      },
    },

    // provideClientHydration(),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  socket = inject(Socket);

  constructor() {
    // Something is wrong with the socket.io configuration, so we need to fix it here
    this.socket.ioSocket.nsp = '/';
  }
}
