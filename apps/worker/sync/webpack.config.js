const { NxWebpackPlugin } = require("@nx/webpack");
const { join } = require("path");

module.exports = {
  plugins: [
    new NxWebpackPlugin({
      outputHashing: "none",
      optimization: process.env.NODE_ENV === "production" ? true : false,
    }),
  ],
  // Add bundle analysis and size limits
  performance: {
    hints: process.env.NODE_ENV === "production" ? "error" : false,
    maxEntrypointSize: 5 * 1024 * 1024, // 5MB limit
    maxAssetSize: 3 * 1024 * 1024, // 3MB limit
  },
  // Enable better tree shaking
  optimization: {
    usedExports: true,
    sideEffects: false,
  },
};
