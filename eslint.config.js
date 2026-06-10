const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const unusedImports = require("eslint-plugin-unused-imports");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    // Never lint build output or caches — dist/ now lives inside each package.
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/i18n.generated.ts",
    ],
  },
  { plugins: { "unused-imports": unusedImports } },
  {
    files: [
      "**/*.ts",
      "**/*.tsx",
      "**/*.js",
      "**/*.jsx",
      "**/*.cts",
      "**/*.mts",
      "**/*.cjs",
      "**/*.mjs",
    ],
    rules: {
      // Auto-removable: unused imports. Reported separately from the
      // typescript-eslint rule so eslint --fix can strip them.
      "unused-imports/no-unused-imports": "warn",
    },
  },
  // TypeScript (was plugin:@nx/typescript — typescript-eslint recommended)
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.cts", "**/*.mts"],
    languageOptions: {
      parser: tsParser,
      sourceType: "module",
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@/no-extra-semi": "error",
      "no-extra-semi": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
    },
  },
  // JavaScript (was plugin:@nx/javascript — eslint recommended + node globals)
  ...compat.config({ env: { node: true, es2022: true } }).map((config) => ({
    ...config,
    files: ["**/*.js", "**/*.jsx", "**/*.cjs", "**/*.mjs"],
    rules: {
      ...config.rules,
      ...js.configs.recommended.rules,
      "@/no-extra-semi": "error",
      "no-extra-semi": "off",
      // Base no-unused-vars (with _-prefix opt-out + catch-clause skip) handles JS.
      // The TS-ESLint variant has no parser context here and double-reports —
      // disable it on .js so the base rule is authoritative.
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
    },
  })),
  ...compat.config({ env: { jest: true, node: true } }).map((config) => ({
    ...config,
    files: ["**/*.spec.ts", "**/*.spec.tsx", "**/*.spec.js", "**/*.spec.jsx"],
    rules: {
      ...config.rules,
    },
  })),
];
