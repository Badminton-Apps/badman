// @ts-check
/// <reference types="@prettier/plugin-pug/src/prettier" />

/**
 * @type {import('prettier').Options}
 */
module.exports = {
  plugins: ['@prettier/plugin-pug'],
  singleQuote: true,

  pugSingleQuote: false,
  printWidth: 100,
  overrides: [
    {
      files: '*.html',
      options: {
        parser: 'angular',
      },
    },
  ],
};
