# Phase 1 Data Model: Workspace Package Graph

This migration has no domain entities. The "model" is the **workspace graph** — the set of packages, their build/test/lint task units, their inter-package dependencies, and their cache contracts. This is what Turborepo reasons over and what the cutover must reconstruct faithfully.

## Entity: Workspace Package

Replaces the Nx `project.json` "project". One per buildable/testable unit.

| Field               | Meaning                            | Source today                         | Target                                                                    |
| ------------------- | ---------------------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `name`              | Unique package identifier          | `project.json.name` / tsconfig alias | `package.json.name` = current `@badman/*` alias (apps: `api`, `worker-*`) |
| `location`          | Directory                          | `apps/*`, `libs/**`                  | `apps/*` (unchanged), `packages/**` (moved from `libs/`)                  |
| `kind`              | app \| worker \| library \| config | executor implies it                  | dir (`apps/` vs `packages/` vs `config/`)                                 |
| `entry` / `exports` | Public surface                     | `tsconfig.paths` → `src/index.ts`    | `package.json.exports` → `dist/index.js` + `dist/index.d.ts`              |
| `internalDeps`      | Other `@badman/*` it imports       | implicit (Nx graph from imports)     | explicit `dependencies: { "@badman/x": "workspace:*" }`                   |
| `tasks`             | build/test/lint/dev/deploy         | `project.json.targets`               | `package.json.scripts` + root `turbo.json` registration                   |
| `buildOutput`       | Cacheable artifact                 | Nx cache output globs                | `dist/**` (libs/apps), `coverage/**` (test)                               |

### Validation rules (cutover invariants)

- **VR-1**: `package.json.name` MUST equal the package's former `@badman/*` alias (apps keep their Nx project name). Else FR-005 (no import edits) breaks.
- **VR-2**: every `@badman/*` specifier appearing in a package's source MUST be declared in that package's `dependencies` (pnpm strict — D2 risk). Derive via import scan.
- **VR-3**: no `tsconfig.paths` entry for any `@badman/*` remains anywhere (D2). IDE + build resolve via workspace symlink.
- **VR-4**: every package that emits `dist` MUST register `outputs: ["dist/**"]` (via the shared `build` task) or its cache is broken (skill: "Missing `outputs` key").
- **VR-5**: each package owns its `tsconfig.json` and lint/test config (no root config that busts all caches).
- **VR-6**: the dependency graph MUST be acyclic (Turborepo errors on cycles). Nx tolerates none today either; verify after declaring deps.

## Entity: Task Pipeline (root `turbo.json`)

| Task     | dependsOn | outputs       | cache | persistent |
| -------- | --------- | ------------- | ----- | ---------- |
| `build`  | `^build`  | `dist/**`     | yes   | no         |
| `lint`   | `^build`  | —             | yes   | no         |
| `test`   | `^build`  | `coverage/**` | yes   | no         |
| `dev`    | —         | —             | no    | yes        |
| `deploy` | `build`   | —             | no    | no         |

## Package Inventory

### apps/ — 5 deployables (locations unchanged)

| Package                          | Path                                  | Build        | Notes                                                            |
| -------------------------------- | ------------------------------------- | ------------ | ---------------------------------------------------------------- |
| `api`                            | `apps/api`                            | `nest build` | Assets: i18n + `compile/libs/{assembly,mailing}`; serves on 5010 |
| `worker-ranking`                 | `apps/worker/ranking`                 | `nest build` | Bull `ranking` queue                                             |
| `worker-sync`                    | `apps/worker/sync`                    | `nest build` | Bull `sync` queue                                                |
| `worker-belgium-flanders-places` | `apps/worker/belgium/flanders/places` | `nest build` | Bull `…-places`                                                  |
| `worker-belgium-flanders-points` | `apps/worker/belgium/flanders/points` | `nest build` | Bull `…-points`                                                  |

### packages/ — 32 internal packages (moved from `libs/backend/*` + `libs/utils`)

Flat: `utils`, `backend-authorization`, `backend-cache`, `backend-cluster`, `backend-compile`, `backend-database`, `backend-generator`, `backend-graphql`, `backend-health`, `backend-logging`, `backend-mailing`, `backend-micro`, `backend-notifications`, `backend-orchestrator`, `backend-pupeteer`, `backend-queue`, `backend-ranking`, `backend-search`, `backend-translate`, `backend-twizzit`, `backend-validation`, `backend-visual`, `backend-websockets`.

Nested (preserve layout via grouped globs):

- `backend-competition/*`: `assembly`, `change-encounter`, `encounter-games`, `enrollment`, `transfer-loans`
- `backend-belgium/flanders/*`: `games`, `places`, `points`

> Alias mapping note: today some nested libs alias to flat names (e.g. `@badman/backend-assembly` → `libs/backend/competition/assembly`). The `package.json.name` MUST keep the existing alias (`@badman/backend-assembly`), independent of the directory nesting (VR-1).

### config/ — optional shared config packages (new, recommended)

| Package                     | Purpose                                                               |
| --------------------------- | --------------------------------------------------------------------- |
| `@badman/typescript-config` | shared base/library tsconfig (replaces `tsconfig.base.json` sharing)  |
| `@badman/eslint-config`     | shared flat ESLint config (replaces root `eslint.config.mjs` sharing) |

### DELETED (D10)

29 `libs/frontend/*`, `apps/badman`, `apps/badman-e2e`, `apps/badman-e2e-desktop`, `apps/badman-e2e-mobile`.

## State Transition: per-package cutover

```
Nx project (project.json + tsconfig.paths alias + @nx executor)
  → add package.json (name, exports, scripts, workspace deps)   [VR-1, VR-2]
  → add/adjust tsconfig.json to emit dist (declaration+map)      [VR-4]
  → add per-package jest.config.ts + eslint config              [VR-5]
  → git mv libs/... → packages/...                              [history-preserving]
  → remove project.json + tsconfig.paths entry                  [VR-3]
  = Turborepo package (verified by `turbo run build test lint --filter=<pkg>`)
```

This per-package transition is the **Phase 2** structural step (FR-017). It is atomic: the repo is only green when **all** packages have transitioned, because intermediate states mix `tsconfig.paths` and `workspace:*` resolution. (Phase 1 — adding `turbo.json` + per-package scripts over the _existing_ Nx structure with `tsconfig.paths` intact — is the incremental, coexisting step that precedes this and is verified via the CI double-run.)
