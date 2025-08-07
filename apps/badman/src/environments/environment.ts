import packages from "../version.json";

export const environment = {
  production: false,
  apiVersion: "v1",
  api: "/api",
  graphql: "/graphql",
  adsense: {
    adClient: "ca-pub-2426855871474715",
    show: false,
  },
  clarity: {
    projectId: "eunlmikxb7",
  },
  google: {
    ads: {
      publisherId: "ca-pub-2426855871474715",
      debug: true,
      slots: {
        sidebar: 4690724012,
        beta: 4921531878,
      },
    },

    analytics: {
      tag: "G-ZB8171V3HR0",
    },
  },
  vitals: {
    url: "https://vitals.vercel-analytics.com/v1/vitals",
    analyticsId: "zKT4xSXr0gDIdX4JmvpaUPwJwMG",
    enabled: false,
  },
  version: packages.version,
  beta: true,
};
