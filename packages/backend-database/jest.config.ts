export default {
  // displayName: 'backend-database',
  preset: "../../jest.preset.js",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
  },
  moduleFileExtensions: ["ts", "js", "html"],
  coverageDirectory: "../../coverage/packages/backend-database",
  moduleNameMapper: {
    "^@badman/backend-database$": "<rootDir>/src/index.ts",
  },
};
