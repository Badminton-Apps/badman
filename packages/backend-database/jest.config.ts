export default {
  // displayName: 'backend-database',
  preset: "../../jest.preset.js",
  // Override the preset's @swc/jest transform: the model graph has circular
  // imports (claim.model <-> role.model, the entry/_interception chain) that
  // @nestjs/graphql's OmitType walks eagerly at load. tsc's CommonJS emit
  // resolves those lazily (namespace property access), swc's stricter ESM
  // emulation throws TDZ errors. ts-jest stays for this package only.
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
  },
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "js", "html"],
  coverageDirectory: "../../coverage/packages/backend-database",
  moduleNameMapper: {
    "^@badman/backend-database$": "<rootDir>/src/index.ts",
  },
};
