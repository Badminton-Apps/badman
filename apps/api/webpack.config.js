const { composePlugins, withNx } = require('@nx/webpack');
const swcDefaultConfig =
  require('@nestjs/cli/lib/compiler/defaults/swc-defaults').swcDefaultsFactory()
    .swcOptions;

// Nx plugins for webpack.
module.exports = composePlugins(withNx(), (config) => {
  // Update the webpack config as needed here.
  // e.g. `config.plugins.push(new MyPlugin())`

  // config.module.rules.push({
  //   test: /\.ts$/,
  //   exclude: /node_modules/,
  //   use: {
  //     loader: 'swc-loader',
  //     options: swcDefaultConfig,
  //   },
  // });


  return config;
});
