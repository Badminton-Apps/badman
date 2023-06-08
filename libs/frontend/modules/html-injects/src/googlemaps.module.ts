import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Inject, NgModule, PLATFORM_ID } from '@angular/core';
import { GOOGLE_MAPS_API_CONFIG } from '@ng-maps/google';

export type GooglMapsConfiguration = Readonly<{
  apiKey: string;
  libraries?: string[];
}>;

@NgModule({})
export class GoogleMapsModule {
  constructor(
    @Inject(PLATFORM_ID)
    platformId: string,
    @Inject(DOCUMENT)
    d: Document,
    @Inject(GOOGLE_MAPS_API_CONFIG)
    { apiKey, libraries }: GooglMapsConfiguration
  ) {
    if (isPlatformBrowser(platformId)) {
      const maps = d.createElement('script');
      maps.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      if (libraries) {
        maps.src += `&libraries=${libraries.join(',')}`;
      }
      maps.async = true;
      maps.crossOrigin = 'anonymous';
      maps.defer = true;

      d.body.appendChild(maps);

      console.log('injecting google maps');
    }
  }
}
