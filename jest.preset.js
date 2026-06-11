const path = require("path");

// Plain shared Jest preset (feature 036 replaced the @nx/jest preset; the
// values below reproduce what this repo actually relied on from it).
module.exports = {
  testEnvironment: "node",
  // Single repo-wide transform: @swc/jest (transpile-only, near-zero compile
  // cost vs ts-jest). Type-checking is the build step's job (tsc), not the
  // test runner's. decorators + decoratorMetadata are required by NestJS DI
  // and sequelize-typescript; keep target in sync with tsconfig.base.json.
  transform: {
    "^.+\\.ts$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: "es2022",
        },
        module: { type: "commonjs" },
      },
    ],
  },
  passWithNoTests: true,
  coverageReporters: ["html", "text", "lcov"],
  // Cold ts-jest compiles of large suites (assembly, graphql) can push the
  // first test past Jest's 5s default when the whole repo runs in parallel —
  // give every suite the same headroom worker-sync always had.
  testTimeout: 30000,
  // Bull/Redis, NestJS DI containers, and worker pools can leave open handles
  // after tests resolve. forceExit prevents jest from hanging at the end of a
  // suite (CI runs were stalling for several minutes per project after
  // "Ran all test suites").
  forceExit: true,
  // Cap workers explicitly so multiple packages running in parallel do not
  // each spin up 4 jest workers on a 4-vCPU runner.
  maxWorkers: 2,
  // Register a no-op IndexCalculationService on EventEntry so test fixtures
  // that save the model do not crash on the BeforeCreate/BeforeUpdate hook.
  setupFiles: [path.join(__dirname, "jest.setup.js")],
};
