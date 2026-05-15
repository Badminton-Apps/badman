const { FlatCompat } = require("@eslint/eslintrc");
const baseConfig = require("../../../eslint.config.js");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  ...baseConfig,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@badman/backend-twizzit"],
              message:
                "Do not import from @badman/backend-twizzit (legacy XML sync). Use @badman/integrations-twizzit-client instead.",
            },
            {
              group: ["@badman/backend-graphql"],
              message: "Shadow sync lib must not import from @badman/backend-graphql.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {},
  },
  {
    files: ["**/*.js", "**/*.jsx"],
    rules: {},
  },
  ...compat.config({ parser: "jsonc-eslint-parser" }).map((config) => ({
    ...config,
    files: ["**/*.json"],
    rules: {
      ...config.rules,
      "@nx/dependency-checks": "error",
    },
  })),
];
