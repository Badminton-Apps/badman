export default {
  // displayName: 'worker-belgium-flanders-points',
  preset: "../../../../../jest.preset.js",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
  },
  moduleFileExtensions: ["ts", "js", "html"],
  coverageDirectory: "../../../../../coverage/apps/worker/badminton/belgium/flanders/points",
};
