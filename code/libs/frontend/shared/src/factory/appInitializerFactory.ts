import { NgxMatMomentAdapter } from '@angular-material-components/moment-adapter';
import { LOCATION_INITIALIZED } from '@angular/common';
import { Injector } from '@angular/core';
import { DateAdapter } from '@angular/material/core';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { lastValueFrom } from 'rxjs';

export const language_map: Map<
  string,
  { translate: string; adapter: string; moment: string }
> = new Map([
  ['en', { translate: 'en', adapter: 'en', moment: 'en' }],
  ['fr_BE', { translate: 'fr_BE', adapter: 'fr', moment: 'fr' }],
  ['nl_BE', { translate: 'nl_BE', adapter: 'nl-be', moment: 'nl-be' }],
]);

export function appInitializerFactory(
  translate: TranslateService,
  injector: Injector,
  adapter: DateAdapter<NgxMatMomentAdapter>
) {
  return async () => {
    try {
      await injector.get(LOCATION_INITIALIZED, Promise.resolve(null));

      translate.addLangs([...language_map.keys()]);
      translate.setDefaultLang('nl_BE');
      const savedLang = localStorage.getItem('translation.language');
      const values = language_map.get(savedLang || 'nl_BE');

      if (!values) {
        return;
      }

      await setLanguage(values.translate, values.moment, adapter, translate);
    } catch (err) {
      console.error('Error', err);
    }
  };
}

export async function setLanguage(
  translateFormat: string,
  momentFormat: string,
  dateAdapater: DateAdapter<NgxMatMomentAdapter>,
  translateService: TranslateService
) {
  // Set values
  await lastValueFrom(translateService.use(translateFormat));
  moment.locale(momentFormat);
  dateAdapater.setLocale(moment.locale());
}
