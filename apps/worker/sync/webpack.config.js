const { NxWebpackPlugin } = require("@nx/webpack");

module.exports = {
  plugins: [
    new NxWebpackPlugin({
      outputHashing: "none",
      optimization: false,
    }),
  ],
};
