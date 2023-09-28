// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
import packages from '../version.json';

export const environment = {
  production: false,
  apiVersion: 'v1',
  api: '/api',
  graphql: '/graphql',
  adsense: {
    adClient: 'ca-pub-2426855871474715',
    show: false,
  },
  clarity: {
    projectId: 'eunlmikxb7',
  },
  google: {
    ads: {
      publisherId: 'ca-pub-2426855871474715',
      debug: true,
      slots: {
        sidebar: 4690724012,
        beta: 4921531878,
      },
    },

    analytics: {
      tag: 'G-ZB8171V3HR0',
    },
  },
  vitals: {
    url: 'https://vitals.vercel-analytics.com/v1/vitals',
    analyticsId: 'zKT4xSXr0gDIdX4JmvpaUPwJwMG',
    enabled: false,
  },
  version: packages.version,
  beta: true,
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
