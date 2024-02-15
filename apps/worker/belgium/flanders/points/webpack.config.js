const { NxWebpackPlugin } = require('@nx/webpack');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../../../../dist/apps/worker/belgium/flanders/points'),
  },
  plugins: [
    new NxWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: [
        './src/assets',
        {
          glob: '**/*',
          input: 'libs/backend/mailing/src/compile',
          output: 'compile/libs/mailing',
        },
        {
          glob: '**/*',
          input: 'libs/backend/translate/assets',
          output: 'assets',
        },
      ],
      optimzation: false,
      outputHashing: 'none',
    }),
  ],
};
