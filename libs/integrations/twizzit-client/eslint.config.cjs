const baseConfig = require("../../../eslint.config.js");

module.exports = [
  ...baseConfig,
  {
    files: ["**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "@badman/backend-database",
            "@badman/backend-graphql",
            "@badman/backend-queue",
            "sequelize",
            "@nestjs/*",
            "bull",
          ],
        },
      ],
    },
  },
];
