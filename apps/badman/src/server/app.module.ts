// needs to be first import, it loads the polyfills
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import {
  ApiKeyMiddleware,
  AuthorizationModule,
} from '@badman/backend-authorization';
import { DatabaseModule } from '@badman/backend-database';
import { GraphqlModule } from '@badman/backend-graphql';
import { HealthModule } from '@badman/backend-health';
import { SyncModule } from '@badman/backend-sync';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AngularRendererModule } from '@nitedani/angular-renderer-nestjs';
import { AppComponent } from '../app/app.component';
import { SharedModule } from '../shared.module';

@Module({
  imports: [
    // Angular imports
    AngularRendererModule.forRoot({
      // import only on server's version of the app
      page: AppComponent,
      imports: [SharedModule],
      providers: [provideNoopAnimations()],
    }),

    // Server imports
    ConfigModule,
    DatabaseModule,
    AuthorizationModule,
    GraphqlModule,
    SyncModule,
    HealthModule,
  ],
  controllers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(ApiKeyMiddleware)
      .exclude({ path: 'graphql', method: RequestMethod.ALL })
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
