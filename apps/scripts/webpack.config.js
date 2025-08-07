const { NxWebpackPlugin } = require("@nx/webpack");
const { join } = require("path");

module.exports = {
  plugins: [
    new NxWebpackPlugin({
      outputHashing: "none",
      optimization: process.env["NODE_ENV"] === "production",
    }),
  ],
};
