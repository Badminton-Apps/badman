# Contract: Internal Package Manifest

The shape every migrated `packages/*` must satisfy. Verifies FR-002, FR-005, FR-019, VR-1..VR-5.

## `package.json` (compiled internal package)

```jsonc
{
  "name": "@badman/backend-database", // MUST equal former alias (VR-1)
  "version": "0.0.0",
  "private": true,
  "type": "commonjs", // match current emit (NestJS default CJS)
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "jest -c jest.config.ts",
    "lint": "eslint .",
  },
  "dependencies": {
    "@badman/utils": "workspace:*", // every imported @badman/* declared (VR-2)
  },
}
```

## `tsconfig.json` (emits dist)

```jsonc
{
  "extends": "@badman/typescript-config/library.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "composite": false, // skill: avoid TS project references
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"],
}
```

## `jest.config.ts` (per package)

```ts
export default {
  preset: "../../jest.preset.js", // plain preset (no @nx/jest)
  testEnvironment: "node",
  transform: { "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }] },
  moduleFileExtensions: ["ts", "js", "html"],
  coverageDirectory: "../../coverage/packages/backend-database",
  moduleNameMapper: { "^@badman/backend-database$": "<rootDir>/src/index.ts" },
};
```

## Root `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "apps/worker/*"
  - "apps/worker/belgium/flanders/*"
  - "packages/*"
  - "packages/backend-competition/*"
  - "packages/backend-belgium/flanders/*"
  - "config/*"
```

## Acceptance

| Check        | Expected                                                                               |
| ------------ | -------------------------------------------------------------------------------------- |
| Name = alias | `import '@badman/backend-database'` resolves with no source edit (FR-005)              |
| Strict deps  | `pnpm install` + `tsc` + tests pass with no phantom-dependency error (VR-2)            |
| No paths     | `grep '@badman' tsconfig.base.json` → empty (VR-3)                                     |
| History      | `git log --follow packages/backend-database/src/...` shows pre-move history (`git mv`) |
| Build emits  | `dist/index.js` + `dist/index.d.ts` + `.d.ts.map` present                              |
