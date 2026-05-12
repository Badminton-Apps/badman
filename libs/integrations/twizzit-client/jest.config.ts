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
};
