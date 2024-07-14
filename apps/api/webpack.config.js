const { NxWebpackPlugin } = require('@nx/webpack');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/api'),
  },
  plugins: [
    new NxWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      sourceMap: true,
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: [
        './src/assets',
        {
          glob: '**/*',
          input: 'libs/backend/translate/assets',
          output: 'assets',
        },
        {
          glob: '**/*',
          input: 'libs/backend/competition/assembly/src/compile',
          output: 'compile/libs/assembly',
        },
        {
          glob: '**/*',
          input: 'libs/backend/mailing/src/compile',
          output: 'compile/libs/mailing',
        },
      ],
      optimization: process.env['NODE_ENV'] === 'production',
      outputHashing: 'none',
      sourceMap: true // Added source map to output (will not work without this)
    }),
  ],
};
