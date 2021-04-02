import { Injector, APP_INITIALIZER } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LOCATION_INITIALIZED } from '@angular/common';

export function appInitializerFactory(
  translate: TranslateService,
  injector: Injector
) {
  return async () => {
    await injector.get(LOCATION_INITIALIZED, Promise.resolve(null));

    translate.addLangs(['en', 'nl', 'fr']);
    translate.setDefaultLang('en');
    const savedLang = localStorage.getItem('translation.language');

    try {
      await translate.use(savedLang || 'en').toPromise();
    } catch (err) {}
  };
}
