module.exports = {
  extends: ['./code/node_modules/@commitlint/config-conventional'],
  rules: {
    "scope-enum": [
      "api",
      "client",
      "scripts",
      "worker-sync",
      "worker-ranking",
      "lib-authorization",
      "lib-database",
      "lib-generator",
      "lib-mailing",
      "lib-notification",
      "lib-pupeteer",
      "lib-queue",
      "lib-search",
      "lib-ranking-calc",
    ],
  }
};
