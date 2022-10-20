import {
  NgxMatDateAdapter,
  NGX_MAT_DATE_FORMATS,
} from '@angular-material-components/datetime-picker';
import {
  NgxMatMomentAdapter,
  NgxMatMomentModule,
  NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS,
  NGX_MAT_MOMENT_FORMATS,
} from '@angular-material-components/moment-adapter';
import {
  HttpClient,
  HttpClientModule,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import {
  MatSnackBarModule,
  MAT_SNACK_BAR_DEFAULT_OPTIONS,
} from '@angular/material/snack-bar';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AuthHttpInterceptor, AuthModule } from '@auth0/auth0-angular';
import { ConfigService } from '@badman/frontend-config';
import { GraphQLModule } from '@badman/frontend-graphql';
import { SharedModule } from '@badman/frontend-shared';
import { GOOGLE_MAPS_API_CONFIG, NgMapsGoogleModule } from '@ng-maps/google';
import { NgMapsCoreModule } from '@ng-maps/core';
import { NgMapsPlacesModule } from '@ng-maps/places';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ApolloModule } from 'apollo-angular';
import { CookieService } from 'ngx-cookie-service';
import {
  NgcCookieConsentConfig,
  NgcCookieConsentModule,
} from 'ngx-cookieconsent';
import { MarkdownModule } from 'ngx-markdown';
import { MomentModule } from 'ngx-moment';
import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NotificationsModule } from '@badman/frontend-notifications';
import { SocketModule, SOCKET_URL } from '@badman/frontend-socket';

const baseModules = [
  BrowserModule,
  AppRoutingModule,
  BrowserAnimationsModule,
  HttpClientModule,
];
const materialModules = [
  MatMomentDateModule,
  NgxMatMomentModule,
  MomentModule.forRoot(),
  MatSnackBarModule,
];
const translateModules = [
  TranslateModule.forRoot({
    defaultLanguage: 'en',
    loader: {
      provide: TranslateLoader,
      useFactory: HttpLoaderFactory,
      deps: [HttpClient],
    },
  }),
];

const appModules = [SharedModule, GraphQLModule];

const cookieConfig: NgcCookieConsentConfig = {
  cookie: {
    domain: 'badman.app',
  },
  position: 'bottom-left',
  theme: 'classic',
  palette: {
    popup: {
      background: '#000000',
      text: '#ffffff',
      link: '#ffffff',
    },
    button: {
      background: '#f1d600',
      text: '#000000',
      border: 'transparent',
    },
  },
  type: 'info',
  content: {
    message:
      'This website uses cookies to ensure you get the best experience on our website.',
    dismiss: 'Got it!',
    deny: 'Refuse cookies',
    link: 'Learn more',
    href: 'https://badman.app/cookies',
    policy: 'Cookie Policy',
  },
};

@NgModule({
  declarations: [AppComponent],
  imports: [
    ...baseModules,
    ...materialModules,
    ...appModules,
    ...translateModules,
    NgcCookieConsentModule.forRoot(cookieConfig),
    ApolloModule,
    MarkdownModule.forRoot(),
    NgMapsCoreModule,
    NgMapsGoogleModule,
    NgMapsPlacesModule.forRoot({ autocomplete: {} }),

    AuthModule.forRoot({
      domain: 'badvlasim.eu.auth0.com',
      clientId: '2LqkYZMbrTTXEE0OMkQJLmpRrOVQheoF',
      audience: `ranking-simulation`,
      useRefreshTokens: true,
      httpInterceptor: {
        allowedList: [
          {
            uriMatcher: (uri) => uri.indexOf('api') > -1,
            allowAnonymous: true,
          },
        ],
      },
    }),
    SocketModule,
    NotificationsModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: true,
      registrationStrategy: 'registerImmediately',
    }),
  ],
  providers: [
    CookieService,
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [ConfigService],
      useFactory: (appConfigService: ConfigService) => {
        return () => {
          //Make sure to return a promise!
          return appConfigService.loadAppConfig();
        };
      },
    },
    {
      provide: NgxMatDateAdapter,
      useClass: NgxMatMomentAdapter,
      deps: [MAT_DATE_LOCALE, NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS],
    },
    {
      provide: GOOGLE_MAPS_API_CONFIG,
      useValue: {
        apiKey: 'AIzaSyBTWVDWCw6c3rnZGG4GQcvoOoLuonsLuLc',
        libraries: ['places'],
      },
    },
    { provide: NGX_MAT_DATE_FORMATS, useValue: NGX_MAT_MOMENT_FORMATS },
    { provide: HTTP_INTERCEPTORS, useClass: AuthHttpInterceptor, multi: true },
    { provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: { duration: 2500 } },
    {
      provide: SOCKET_URL,
      useValue: environment.api,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  // constructor(apmService: ApmService) {
  // if (environment.production) {
  //   // Agent API is exposed through this apm instance
  //   apmService.init({
  //     serviceName: 'badman-client',
  //     serviceVersion: environment.version,
  //     serverUrl: environment.apmServer,
  //     environment: environment.production ? 'production' : 'development',
  //   });
  // }
  // }
}

// required for AOT compilation
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}
