const nxPreset = require("@nx/jest/preset").default;

module.exports = {
  ...nxPreset,
  // Bull/Redis, NestJS DI containers, and worker pools can leave open handles
  // after tests resolve. forceExit prevents jest from hanging at the end of a
  // suite (CI runs were stalling for several minutes per project after
  // "Ran all test suites").
  forceExit: true,
  // Cap workers explicitly so multiple nx projects running in parallel do not
  // each spin up 4 jest workers on a 4-vCPU runner.
  maxWorkers: 2,
};
