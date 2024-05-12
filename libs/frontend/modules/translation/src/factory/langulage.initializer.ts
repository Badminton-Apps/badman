import { isPlatformBrowser, LOCATION_INITIALIZED } from '@angular/common';
import { effect, Injector, PLATFORM_ID } from '@angular/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter } from '@angular/material/core';
import { AuthenticateService } from '@badman/frontend-auth';
import { AvaliableLanguages, languages } from '@badman/utils';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { lastValueFrom } from 'rxjs';

export function langulageInitializer(
  translate: TranslateService,
  injector: Injector,
  adapter: DateAdapter<MomentDateAdapter>,
  authenticateService: AuthenticateService,
) {
  return async () => {
    const setLang = async (savedLang?: AvaliableLanguages) => {
      if (!savedLang) {
        return;
      }

      const values = languages.get(savedLang ? savedLang : AvaliableLanguages.nl_BE);

      if (!values) {
        return;
      }

      await setLanguage(values.translate, values.moment, adapter, translate);
    };

    try {
      await injector.get(LOCATION_INITIALIZED, Promise.resolve(null));
      const platform = injector.get(PLATFORM_ID);

      translate.addLangs([...languages.keys()]);
      translate.setDefaultLang(AvaliableLanguages.nl_BE);

      let savedLang = isPlatformBrowser(platform)
        ? (localStorage.getItem('translation.language') as AvaliableLanguages)
        : undefined;

      if (!savedLang && isPlatformBrowser(platform)) {
        effect(
          () => {
            if (authenticateService.loggedIn()) {
              if (authenticateService.user()?.setting?.language) {
                savedLang = authenticateService.user()?.setting?.language;
              }
            }
            setLang(savedLang);
          },
          {
            injector,
          },
        );
      }

      // Set language if saved
      setLang(savedLang ?? AvaliableLanguages.nl_BE);
    } catch (err) {
      console.error('Error', err);
    }
  };
}

export async function setLanguage(
  translateFormat: string,
  momentFormat: string,
  dateAdapater: DateAdapter<MomentDateAdapter>,
  translateService: TranslateService,
) {
  // Set values
  await lastValueFrom(translateService.use(translateFormat));
  moment.locale(momentFormat);
  dateAdapater.setLocale(moment.locale());
}
