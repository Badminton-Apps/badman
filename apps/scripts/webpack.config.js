const { composePlugins, withNx } = require("@nx/webpack");

function allowBadmanInternals(externals) {
  return [].concat(externals || []).map((ext) => {
    if (typeof ext !== "function") return ext;
    return function (...args) {
      const request = args[0]?.request ?? args[1];
      if (typeof request === "string" && request.startsWith("@badman/")) {
        const cb = args[args.length - 1];
        if (typeof cb === "function") return cb();
      }
      return ext(...args);
    };
  });
}

module.exports = composePlugins(withNx(), (config) => {
  return {
    ...config,
    optimization: {
      minimize: process.env["NODE_ENV"] === "production",
    },
    externals: allowBadmanInternals(config.externals),
  };
});
