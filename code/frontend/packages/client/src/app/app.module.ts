import { AgmCoreModule } from '@agm/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, Injector, NgModule } from '@angular/core';
import { FlexLayoutModule, FlexModule } from '@angular/flex-layout';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import {
  TranslateLoader,
  TranslateModule,
  TranslateService,
} from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { MarkdownModule } from 'ngx-markdown';
import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GraphQLModule } from './graphql.module';
import { appInitializerFactory } from './_shared/factory/appInitializerFactory';
import { SharedModule } from './_shared/shared.module';

const baseModules = [
  BrowserModule,
  AppRoutingModule,
  BrowserAnimationsModule,
  HttpClientModule,
];
const materialModules = [MatSnackBarModule];
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

@NgModule({
  declarations: [AppComponent],
  imports: [
    ...baseModules,
    ...materialModules,
    ...appModules,
    ...translateModules,
    MarkdownModule.forRoot(),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
    }),
    AgmCoreModule.forRoot({
      apiKey: 'AIzaSyBTWVDWCw6c3rnZGG4GQcvoOoLuonsLuLc',
      libraries: ['places'],
    })
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializerFactory,
      deps: [TranslateService, Injector],
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

// required for AOT compilation
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}
