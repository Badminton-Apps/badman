const { composePlugins, withNx } = require("@nx/webpack");
const { join } = require("path");

module.exports = composePlugins(withNx(), (config) => {
  return {
    ...config,
    // keep existing output, just override path
    output: {
      ...config.output,
      path: join(__dirname, "../../dist/apps/api"),
    },
    // keep existing externals and append our own
    // webpack accepts arrays of externals (objects, functions, regexps, etc.)
    externals: [
      ...(Array.isArray(config.externals)
        ? config.externals
        : config.externals
          ? [config.externals]
          : []),
      {
        "node-adodb": "commonjs node-adodb",
      },
    ],
  };
});
