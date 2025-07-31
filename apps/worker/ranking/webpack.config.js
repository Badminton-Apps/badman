const { NxWebpackPlugin } = require('@nx/webpack');
const { join } = require('path');

module.exports = {
  plugins: [
    new NxWebpackPlugin({
      outputHashing: 'none',
      optimization: false,
    }),
  ],
};
