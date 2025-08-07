// @ts-check

/**
 * @type {import('prettier').Options}
 */
module.exports = {
  // Plugins
  plugins: ["@prettier/plugin-pug"],

  // Quote settings
  singleQuote: false, // Using the .cjs setting as it's more common for modern JS
  pugSingleQuote: false,

  // Formatting
  semi: true,
  tabWidth: 2,
  printWidth: 100,
  bracketSpacing: true,
  bracketSameLine: false,
  trailingComma: "es5",
  quoteProps: "as-needed",
  arrowParens: "always",

  // File-specific overrides
  overrides: [
    {
      files: "*.html",
      options: {
        parser: "angular",
      },
    },
  ],
};
