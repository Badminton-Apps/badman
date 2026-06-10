export default {
  // displayName: 'belgium-flanders-place',
  preset: "../../../../jest.preset.js",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
  },
  moduleFileExtensions: ["ts", "js", "html"],
  coverageDirectory: "../../../../coverage/packages/backend-belgium/flanders/places",
};
