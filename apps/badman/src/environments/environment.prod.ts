import packages from '../version.json';

export const environment = {
  production: true,
  apiVersion: 'v1',
  api: '/api',
  graphql: '/graphql',
  adsense: {
    adClient: 'ca-pub-2426855871474715',
    show: true,
  },
  clarity: {
    enbaled: true,
    projectId: 'eunlmikxb7',
  },
  google: {
    ads: {
      enbaled: true,
      publisherId: 'ca-pub-2426855871474715',
      debug: false,
      slots: {
        sidebar: 4690724012,
        beta: 4921531878,
      },
    },
    analytics: {
      enbaled: true,
      tag: 'G-ZB8171V3HR0',
    },
  },
  vitals: {
    url: 'https://vitals.vercel-analytics.com/v1/vitals',
    analyticsId: 'zKT4xSXr0gDIdX4JmvpaUPwJwMG',
    enabled: true,
  },
  version: packages.version,
  beta: false,
};
