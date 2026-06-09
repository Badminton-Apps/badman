# Contract: Turborepo Task Pipeline (`turbo.json`)

The orchestration contract every package must satisfy. Verifies FR-002, FR-007, FR-008, FR-009.

## Root `turbo.json`

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["tsconfig.base.json", ".nvmrc"],
  "globalEnv": ["NODE_ENV"],
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "lint": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "dev": { "cache": false, "persistent": true },
    "deploy": { "dependsOn": ["build"], "cache": false },
  },
}
```

## Root `package.json` (delegation only — no task logic)

```jsonc
{
  "private": true,
  "packageManager": "pnpm@<pinned>",
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "dev": "turbo run dev",
    "start:server": "turbo run dev --filter=api --filter=worker-sync",
  },
  "devDependencies": { "turbo": "latest" },
}
```

## Per-package script contract

Every `packages/*` and `apps/*` package.json MUST expose the scripts for the tasks it participates in:

```jsonc
// library (packages/backend-database)
{ "scripts": { "build": "tsc -p tsconfig.json", "test": "jest -c jest.config.ts", "lint": "eslint ." } }

// app (apps/api)
{ "scripts": { "build": "nest build", "dev": "nest start --watch", "deploy": "node ../../scripts/render.js --app=api", "test": "jest -c jest.config.ts", "lint": "eslint ." } }
```

## Acceptance

| Check                            | Command                                             | Expected                                                     |
| -------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| Build graph respects order       | `turbo run build` cold                              | libs build before dependent apps; 0 errors                   |
| Cache restores                   | `turbo run build` twice                             | 2nd run: all `cached`, `>>> FULL TURBO`, < 30s (SC-003)      |
| Cache invalidates on real change | edit one lib src, `turbo run build`                 | that lib + its dependents rebuild; unrelated cached (FR-009) |
| Affected filtering               | `turbo run lint test --affected` after 1-lib change | only that lib + dependents run (FR-007, SC-004)              |
| Outputs declared                 | `turbo run build --dry=json`                        | every emitting package lists `dist/**` (VR-4)                |
| Dev/serve                        | `pnpm dev --filter=api`                             | API serves on 5010, watch reload (FR-006)                    |
