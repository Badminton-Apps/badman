const { NxWebpackPlugin } = require('@nx/webpack');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/scripts'),
  },
  plugins: [
    new NxWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      sourceMap: true,
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      outputHashing: 'none',
      optimization: process.env['NODE_ENV'] === 'production',
    }),
  ],
};
