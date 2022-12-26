import packages from '../version.json';

export const environment = {
  production: true,
  api: 'https://server-2msl.onrender.com',
  apiVersion: 'v1',
  apmServer: 'https://apm.badman.app',
  adsense: {
    adClient: 'ca-pub-2426855871474715',
    show: true,
  },
  version: packages.version
};
