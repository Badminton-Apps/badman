import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Inject, NgModule, PLATFORM_ID } from '@angular/core';
import { GOOGLE_MAPS_API_CONFIG } from '@ng-maps/google';
import { Libraries, Loader } from '@googlemaps/js-api-loader';

export type GooglMapsConfiguration = Readonly<{
  apiKey: string;
  libraries?: Libraries;
}>;

@NgModule({})
export class GoogleMapsModule {
  constructor(
    @Inject(PLATFORM_ID)
    platformId: string,
    @Inject(DOCUMENT)
    d: Document,
    @Inject(GOOGLE_MAPS_API_CONFIG)
    { apiKey, libraries }: GooglMapsConfiguration,
  ) {
    if (isPlatformBrowser(platformId)) {
      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: libraries ?? ([] as Libraries),
      });
      // Promise
      loader
        .load()
        .then(() => {
          // console.log('injected google maps');
        })
        .catch((e) => {
          console.error(e);
        });

      // const maps = d.createElement('script');
      // maps.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      // if (libraries) {
      //   maps.src += `&libraries=${libraries.join(',')}`;
      // }
      // maps.async = true;
      // maps.crossOrigin = 'anonymous';
      // maps.defer = true;

      // d.body.appendChild(maps);

      // console.log('injecting google maps');
    }
  }
}
