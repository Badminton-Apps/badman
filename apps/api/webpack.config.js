const { NxAppWebpackPlugin } = require("@nx/webpack/app-plugin");
const { join } = require("path");

const isProd = process.env.NODE_ENV === "production";

module.exports = {
  output: {
    path: join(__dirname, "../../dist/apps/api"),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: "node",
      compiler: "tsc",
      main: "./src/main.ts",
      tsConfig: "./tsconfig.app.json",
      optimization: isProd,
      outputHashing: isProd ? "all" : "none",
      generatePackageJson: true,
      assets: [
        "./src/assets",
        {
          glob: "**/*",
          input: "libs/backend/translate/assets",
          output: "assets",
        },
        {
          glob: "**/*",
          input: "libs/backend/competition/assembly/src/compile",
          output: "compile/libs/assembly",
        },
        {
          glob: "**/*",
          input: "libs/backend/mailing/src/compile",
          output: "compile/libs/mailing",
        },
      ],
    }),
  ],
};
