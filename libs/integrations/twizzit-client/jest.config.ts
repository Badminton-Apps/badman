// SC-005 budget: < 10s; observed 2026-05-13: 2.8s–3.2s (48 tests, 6 suites, 1 live-skipped)
export default {
  displayName: "integrations-twizzit-client",
  preset: "../../../jest.preset.js",
  testEnvironment: "node",
  transform: {
    "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
  },
  moduleFileExtensions: ["ts", "js", "html"],
  coverageDirectory: "../../../coverage/libs/integrations/twizzit-client",
  testMatch: ["**/test/**/*.spec.ts", "**/src/**/*.spec.ts"],
  setupFilesAfterEnv: ["<rootDir>/test/setup.offline.ts"],
};
