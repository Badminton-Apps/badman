const path = require("path");

// Plain shared Jest preset (feature 036 replaced the @nx/jest preset; the
// values below reproduce what this repo actually relied on from it).
module.exports = {
  testEnvironment: "node",
  // Per-package jest.config.ts files define their own ts-jest transform; this
  // preset only carries the repo-wide behaviour.
  passWithNoTests: true,
  coverageReporters: ["html", "text", "lcov"],
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
