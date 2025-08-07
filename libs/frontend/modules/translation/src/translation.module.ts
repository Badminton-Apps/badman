import { registerLocaleData } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import myLocaleEn from "@angular/common/locales/en";
import myLocaleFr from "@angular/common/locales/fr-BE";
import myLocaleNl from "@angular/common/locales/nl-BE";
import {
  importProvidersFrom,
  inject,
  InjectionToken,
  Injector,
  makeEnvironmentProviders,
  provideAppInitializer,
} from "@angular/core";
import { MatMomentDateModule, MomentDateAdapter } from "@angular/material-moment-adapter";
import { DateAdapter, MAT_DATE_LOCALE } from "@angular/material/core";
import { AuthenticateService } from "@badman/frontend-auth";
import {
  MomentDatetimeAdapter,
  MtxMomentDatetimeModule,
  provideMomentDatetimeAdapter,
} from "@ng-matero/extensions-moment-adapter";
import { DatetimeAdapter } from "@ng-matero/extensions/core";
import {
  provideTranslateService,
  TranslateLoader,
  TranslateParser,
  TranslateService,
} from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";
import { langulageInitializer } from "./factory";
import { ITranslateConfig } from "./interfaces";
import { SingleBracketInterpolation } from "./services";

// Register locales
import "moment/locale/fr";
import "moment/locale/nl-be";

registerLocaleData(myLocaleNl, "nl-BE");
registerLocaleData(myLocaleFr, "fr-BE");
registerLocaleData(myLocaleEn, "en");

export const TRANSLATE_CONFIG = new InjectionToken<ITranslateConfig>("TRANSLATE_CONFIG");

export function provideTranslation(config: ITranslateConfig) {
  return makeEnvironmentProviders([
    { provide: MAT_DATE_LOCALE, useValue: "nl-BE" }, // or your desired locale
    importProvidersFrom(MatMomentDateModule),
    importProvidersFrom(MtxMomentDatetimeModule),
    {
      provide: TRANSLATE_CONFIG,
      useValue: config,
    },
    provideTranslateService({
      defaultLanguage: "en",
      parser: {
        provide: TranslateParser,
        useClass: SingleBracketInterpolation,
      },
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient, cfg: ITranslateConfig) =>
          new TranslateHttpLoader(http, cfg.api, ""),
        deps: [HttpClient, TRANSLATE_CONFIG],
      },
    }),
    provideAppInitializer(() => {
      return langulageInitializer(
        inject(TranslateService),
        inject(Injector),
        inject(DateAdapter),
        inject(DatetimeAdapter),
        inject(AuthenticateService)
      );
    }),
    {
      provide: DatetimeAdapter,
      useClass: MomentDatetimeAdapter,
    },
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
    },
    provideMomentDatetimeAdapter(),
    SingleBracketInterpolation,
  ]);
}
