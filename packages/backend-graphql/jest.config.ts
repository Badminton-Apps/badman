export default {
  // displayName: 'backend-graphql',
  preset: "../../jest.preset.js",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
  },
  moduleFileExtensions: ["ts", "js", "html"],
  coverageDirectory: "../../coverage/packages/backend-graphql",
  coverageReporters: ["text", "lcov"],
  testPathIgnorePatterns: ["/node_modules/", "\\.integration\\.spec\\.ts$"],
  coverageThreshold: {
    global: {
      lines: 45,
      branches: 30,
      functions: 25,
      statements: 50,
    },
  },
};
