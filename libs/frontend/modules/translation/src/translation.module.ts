import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  APP_INITIALIZER,
  InjectionToken,
  Injector,
  ModuleWithProviders,
  NgModule,
} from '@angular/core';
import { DateAdapter } from '@angular/material/core';
import {
  TranslateLoader,
  TranslateModule,
  TranslateParser,
  TranslateService,
} from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { langulageInitializer } from './factory';
import { ITranslateConfig } from './interfaces';
import { provideMomentDatetimeAdapter } from '@ng-matero/extensions-moment-adapter';

import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { AuthenticateService } from '@badman/frontend-auth';
import { MomentModule } from 'ngx-moment';
import { SingleBracketInterpolation } from './services';

export const TRANSLATE_CONFIG = new InjectionToken<ITranslateConfig>('TRANSLATE_CONFIG');

@NgModule({
  imports: [
    CommonModule,
    MatMomentDateModule,
    MomentModule.forRoot(),
    TranslateModule.forRoot({
      defaultLanguage: 'en',
      parser: {
        provide: TranslateParser,
        useClass: SingleBracketInterpolation,
      },
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient, config: ITranslateConfig) =>
          new TranslateHttpLoader(http, config.api, ''),
        deps: [HttpClient, TRANSLATE_CONFIG],
      },
    }),
  ],
  providers: [
    SingleBracketInterpolation,
    {
      provide: APP_INITIALIZER,
      useFactory: langulageInitializer,
      deps: [TranslateService, Injector, DateAdapter, AuthenticateService],
      multi: true,
    },
    provideMomentDatetimeAdapter(),
  ],
})
export class TranslationModule {
  public static forRoot(config: ITranslateConfig): ModuleWithProviders<TranslationModule> {
    return {
      ngModule: TranslationModule,
      providers: [{ provide: TRANSLATE_CONFIG, useValue: config }],
    };
  }
}
