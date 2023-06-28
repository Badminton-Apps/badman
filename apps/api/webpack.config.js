const { composePlugins, withNx } = require('@nx/webpack');

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), (config) => {
  // Update the webpack config as needed here.
  // e.g. `config.plugins.push(new MyPlugin())`

  // config.module.rules.push({
  //   test: /\.ts$/,
  //   exclude: /node_modules/,
  //   use: {
  //     loader: 'swc-loader',
  //   },
  // });

  return config;
});
