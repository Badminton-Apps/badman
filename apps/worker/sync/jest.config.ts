export default {
  // displayName: 'worker-sync',
  preset: "../../../jest.preset.js",
  testEnvironment: "node",
  transform: {
    "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
  },
  moduleFileExtensions: ["ts", "js", "html"],
  coverageDirectory: "../../../coverage/apps/worker/sync",
  // strip-ansi v7 is ESM-only but string-length (used by @jest/reporters) needs CJS.
  moduleNameMapper: {
    "^strip-ansi$": "<rootDir>/__mocks__/strip-ansi.js",
  },
  // Bull keeps Redis connections open after tests; forceExit prevents hanging
  forceExit: true,
};
