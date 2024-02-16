import {
  APP_INITIALIZER,
  InjectionToken,
  Injector,
  ModuleWithProviders,
  NgModule,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { langulageInitializer } from './factory';
import {
  TranslateLoader,
  TranslateModule,
  TranslateParser,
  TranslateService,
} from '@ngx-translate/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ITranslateConfig } from './interfaces';
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
import { MomentModule } from 'ngx-moment';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { SingleBracketInterpolation } from './services';
import { AuthenticateService } from '@badman/frontend-auth';

export const TRANSLATE_CONFIG = new InjectionToken<ITranslateConfig>('TRANSLATE_CONFIG');

@NgModule({
  imports: [
    CommonModule,
    MatMomentDateModule,
    NgxMatMomentModule,
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
    {
      provide: NgxMatDateAdapter,
      useClass: NgxMatMomentAdapter,
      deps: [MAT_DATE_LOCALE, NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS],
    },
    { provide: NGX_MAT_DATE_FORMATS, useValue: NGX_MAT_MOMENT_FORMATS },
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
