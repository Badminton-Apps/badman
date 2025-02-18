import { CommonModule, registerLocaleData } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import myLocaleEn from '@angular/common/locales/en';
import myLocaleFr from '@angular/common/locales/fr-BE';
import myLocaleNl from '@angular/common/locales/nl-BE';
import { InjectionToken, Injector, ModuleWithProviders, NgModule, inject, provideAppInitializer } from '@angular/core';
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

import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { AuthenticateService } from '@badman/frontend-auth';
import { MomentDatetimeAdapter, provideMomentDatetimeAdapter } from '@ng-matero/extensions-moment-adapter';
import { DatetimeAdapter } from '@ng-matero/extensions/core';
import { MomentModule } from 'ngx-moment';
import { SingleBracketInterpolation } from './services';
export const TRANSLATE_CONFIG = new InjectionToken<ITranslateConfig>('TRANSLATE_CONFIG');

// Register locales
import 'moment/locale/fr'
import 'moment/locale/nl-be'
registerLocaleData(myLocaleNl, 'nl-BE');
registerLocaleData(myLocaleFr, 'fr-BE');
registerLocaleData(myLocaleEn, 'en');


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
    provideAppInitializer(() => {
        const initializerFn = (langulageInitializer)(inject(TranslateService), inject(Injector), inject(DateAdapter), inject(DatetimeAdapter), inject(AuthenticateService));
        return initializerFn();
      }),
    {
      provide: DatetimeAdapter,
      useClass: MomentDatetimeAdapter,
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
