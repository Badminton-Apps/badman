const { composePlugins, withNx } = require("@nx/webpack");
const { join } = require("path");

// Wrap each externals function so that @badman/* workspace packages are
// bundled inline instead of being externalized. npm workspaces creates
// node_modules/@badman/* symlinks that point to TypeScript source dirs —
// no compiled .js exists there, so requiring them at runtime would fail.
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
    output: {
      ...config.output,
      path: join(__dirname, "../../dist/apps/api"),
    },
    externals: [
      ...allowBadmanInternals(config.externals),
      {
        "node-adodb": "commonjs node-adodb",
      },
    ],
  };
});
