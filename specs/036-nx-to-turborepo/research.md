# Phase 0 Research: Nx → Turborepo Migration

Sources: clarifications in [spec.md](spec.md) (Session 2026-06-09), the installed `turborepo` agent skill (`.agents/skills/turborepo/references/**`, v2.9.17-canary.1), and the current repo's Nx config. Each decision below resolves an unknown for planning.

---

## D1 — Internal package compilation strategy

**Decision**: Compiled packages. Each `packages/*` emits to `dist` via `tsc`; consumers depend on the built output through `workspace:*` + the package's `exports` map.

**Rationale**: Skill `best-practices/packages.md` — "You want Turborepo to cache builds → Compiled" and "Use `tsc` for internal packages, prefer over bundlers" and "Package will be used by non-bundler tools → Compiled". The API/workers run on Node and (with `nest build`) are tsc-compiled, so libs must present real JS + `.d.ts`. Compiled gives per-package cache (the speed goal) and a clean `dependsOn: ["^build"]` graph.

**Alternatives considered**: JIT (export raw `.ts`) — rejected: the skill warns "TypeScript `compilerOptions.paths` breaks with JIT packages" and JIT yields no per-package cache. The repo relies on ~32 `@badman/*` aliases, so dropping `paths` entirely (D2) is required either way; compiled is the cacheable choice.

**Implementation notes**: enable `declaration` + `declarationMap` for IDE go-to-def (skill). Register `dist/**` in `turbo.json` outputs. Each package: `"exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } }` (current alias entry is `src/index.ts`).

---

## D2 — Module resolution: drop `tsconfig.paths`, use workspace deps

**Decision**: Remove the ~32 `@badman/*` entries from `tsconfig.base.json` `paths`. Each consumer declares `"@badman/<name>": "workspace:*"` in its `package.json`; resolution is native pnpm symlink + the package's `exports`. **Import specifiers in source are unchanged** because each package's `name` equals its current alias.

**Rationale**: Skill `best-practices/packages.md` — "Use Node.js Subpath Imports (Not `paths`)" and "Avoid TypeScript Project References — Turborepo handles dependencies better." Workspace deps make the dependency graph explicit to Turborepo (correct cache + affected). Satisfies FR-005 (no import edits) and FR-019.

**Alternatives**: keep `paths` — rejected: invisible to Turborepo's graph, breaks affected/cache correctness, fights the tool.

**Risk**: a package that imports a `@badman/*` it does not declare as a dependency will fail under pnpm's strict resolution (phantom dependency). This is a _feature_ (surfaces real bugs) but means every package's dependency list must be derived from its actual imports during the cutover. Mitigation: generate dependency lists by scanning imports (one-time script) and let `pnpm install` + `tsc` + tests flush out gaps.

---

## D3 — App/worker bundler: `nest build`

**Decision**: Build each app/worker with `nest build` (NestJS CLI, `tsc` builder), replacing `@nx/webpack:webpack`. Asset copying and the `node-adodb` external move into `nest-cli.json`.

**Rationale**: Clarify Q2. Skill `best-practices/structure.md` shows `apps/api` building with `tsc`. `nest build` is the idiomatic NestJS builder, fast, and consumes compiled `@badman/*` packages directly. Avoids maintaining bespoke webpack config.

**Load-bearing details to preserve** (from `apps/api/project.json` + `webpack.config.js`):

- **Assets**: today webpack copies `apps/api/src/assets`, `libs/backend/translate/assets` → `assets`, `libs/backend/competition/assembly/src/compile` → `compile/libs/assembly`, `libs/backend/mailing/src/compile` → `compile/libs/mailing`. Replicate via `nest-cli.json` `compilerOptions.assets` (with `outDir`-relative globs) per app that needs them. **This protects Constitution II** (i18n assets must ship) and the compile-template features.
- **External**: `node-adodb` marked `commonjs node-adodb` in webpack. With `nest build` (unbundled, node_modules resolved at runtime) externals are moot — it stays a normal runtime dependency. Verify the twizzit/ADO path still resolves.
- **Output**: today `dist/apps/<name>`. Keep the same `outDir` so Render's start path is unchanged.

**Alternatives**: keep webpack (`nest build --webpack`) — closer byte-parity, leaner single-file bundle, but more config and slower; rejected per Q2. esbuild/swc bundle — fastest but new tooling to validate; rejected for parity-first.

**Open verification (do at implementation)**: confirm whether any worker relies on webpack single-file bundling for its Render start command; if a worker's Render start expects one file, either keep `--webpack` for that app or update the start command. Lean-bundle expectation (Constitution: workers import only needed modules) is satisfied by NestJS module graph regardless of bundler.

---

## D4 — Package manager: pnpm

**Decision**: pnpm with `pnpm-workspace.yaml` (`apps/*`, `packages/**`, `config/*`), `workspace:*` internal deps, `pnpm-lock.yaml` replacing `package-lock.json`. `packageManager` field pins the pnpm version.

**Rationale**: Clarify Q3; skill `best-practices/structure.md` marks pnpm "Recommended". Strict node_modules catches phantom deps (see D2 risk). Grouped globs `packages/**` keep the nested `competition/*` and `belgium/flanders/*` layout without flattening (skill warns against `packages/**` ambiguity only when it causes overlap — here the nesting is intentional and each leaf has its own `package.json`, so use explicit grouped globs: `packages/*`, `packages/backend-competition/*`, `packages/backend-belgium/flanders/*`).

**CI/runtime impact**: `pnpm/action-setup` + `actions/setup-node` `cache: pnpm`; `pnpm install --frozen-lockfile`. Render build command → `corepack enable && pnpm install --frozen-lockfile && pnpm turbo run build --filter=<app>`. `.nvmrc` (20.19.0) retained.

**Alternatives**: stay npm — zero migration risk but forgoes install-speed + strictness; rejected per Q3.

---

## D5 — Turborepo task pipeline

**Decision**: single root `turbo.json`. Package tasks only (scripts live in each package's `package.json`); root `package.json` scripts only delegate via `turbo run`.

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "lint": { "dependsOn": ["^build"] }, // libs must be built for type-aware lint of consumers
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "dev": { "cache": false, "persistent": true }, // serve/watch
    "deploy": { "dependsOn": ["build"], "cache": false }, // posts Render hook (render.js)
  },
}
```

**Rationale**: Skill `best-practices/structure.md` + `IMPORTANT: Package Tasks, Not Root Tasks`. `dependsOn: ["^build"]` enforces FR-002 ordering; `outputs` enable cache restore (FR-008). `dev`/`deploy` are non-cacheable. Mirrors current Nx `targetDefaults` (`@nx/js:tsc` had `dependsOn: ["^build"]`).

**Cache inputs (FR-009 correctness)**: rely on Turborepo's default hashing (package files + declared deps + lockfile). Add `globalDependencies` for root `tsconfig` base and any env that affects builds. Each package keeps its own `tsconfig.json`/`eslint.config` so a change to one package's config does not bust the whole repo (skill: "No Root tsconfig.json … causes all tasks to miss cache").

---

## D6 — Test orchestration (Jest retained)

**Decision**: Keep Jest + ts-jest. Replace `jest.preset.js`'s `@nx/jest/preset` with a plain preset object (the Nx preset mainly sets `transform`/`testEnvironment`/`moduleFileExtensions`; reproduce those + the existing `forceExit`, `maxWorkers: 2`, `setupFiles`). Replace root `jest.config.ts` (`getJestProjectsAsync` from `@nx/jest`) with either per-package invocation (`turbo run test` runs each package's `jest -c jest.config.ts`) or a Jest `projects` array enumerated explicitly. Per-package `jest.config.ts` keeps `ts-jest` + `moduleNameMapper` for `@badman/*` → `src/index.ts` (tests run against source, no build needed → fast).

**Rationale**: FR-003 (same tests, same outcomes, coverage threshold retained). Keeping `moduleNameMapper` to `src` means `test` does not strictly need `^build`; however leaving `dependsOn: ["^build"]` on `test` is harmless and guarantees type correctness — decide at implementation whether to drop it for speed. Integration-test gate (`RUN_INTEGRATION_TESTS=1`) and the `jest.setup.js` IndexCalculationService stub are preserved.

**Alternatives**: switch to swc-jest or Vitest — out of scope (assumption: retain Jest/ESLint).

---

## D7 — Lint orchestration (ESLint retained)

**Decision**: Keep ESLint flat config. Replace the `@nx/eslint:lint` executor with each package running `eslint .` as its `lint` script. Optionally extract a shared `config/eslint-config` package (skill-recommended) that packages extend, replacing root `eslint.config.mjs` sharing. Remove `@nx/eslint-plugin` Nx-specific rules.

**Rationale**: FR-004 (same rules, equivalent results). Per-package configs prevent root-config cache busting.

---

## D8 — CI affected + caching

**Decision**: Replace `nx affected -t lint test -c ci --exclude=<legacy>` with `turbo run lint test --affected` over pnpm. Drop `scripts/ci/legacy-projects.js` and the `scope:legacy` exclusion (FE deleted). Replace `nrwl/nx-set-shas` with Turborepo's built-in `--affected` (auto-derives base/head from git; for PRs set `TURBO_SCM_BASE`/`TURBO_SCM_HEAD` if the default base is wrong). Cache `.turbo` via `actions/cache` (keyed on lockfile + ref), mirroring today's `.nx/cache` caching.

**Production base resolution (FR-013)**: current deploy-production overrides `NX_BASE` to the last `git describe --match 'v*'` tag hash. Turborepo equivalent: `turbo run build --filter='...[<LAST_TAG_HASH>]'` (filter by changed-since-ref) or set `TURBO_SCM_BASE=<LAST_TAG_HASH>` before `turbo run build --affected`. Keep the existing tag-resolution shell step; only the consuming command changes.

**Rationale**: Skill `ci/RULE.md` + `filtering/patterns.md`. Local cache only (FR-018; no Nx Cloud confirmed). Remote cache is an optional later enhancement.

**Build excluded from PR gate**: today's PR gate runs lint+test only (build excluded by design). Preserve — `turbo run lint test --affected` in the PR workflow; build stays in deploy workflows.

---

## D9 — Release tooling (resolves deferred clarification)

**Decision**: **release-please** (Google), single-version mode (`release-type: node` / `simple`, one component for the whole repo), via `googleapis/release-please-action` in GitHub Actions.

**Rationale**: Clarify Q4 = single repo-wide version + FR-012 (commit-driven, no hand-authored entries). release-please reads conventional commits, maintains a release PR with an auto-generated changelog, and on merge creates the git tag + GitHub release — matching today's `nx release` outputs (changelog + git tag + GitHub release) with **zero contributor effort beyond commit messages**. Its release-PR model integrates cleanly with the existing "push to `main` → deploy-production" flow: the release-PR merge produces the tag that deploy-production already consumes for its affected base (D8).

**Alternatives considered**:

- **semantic-release** — also commit-driven, but runs on push (no release PR) and is heavier to configure for a single-version monorepo; viable but release-please's PR + manifest model is a closer fit to the current tag-on-main behavior and easier to review.
- **Changesets** — explicitly rejected in clarify Q4 (requires hand-authored changeset files).

**Reconciliation with deploy-production**: today deploy-production "creates a release tag" via `nx release`. Replace that step: either (a) release-please-action creates the tag/release and deploy-production triggers on the tag, or (b) keep deploy-production triggered on push to `main` and let release-please own only tag+changelog. Decide exact wiring in tasks; both preserve the migration concurrency lock + prod approval gate (FR-010), which live in `_shared-migrate.yml` and are untouched.

---

## D10 — Legacy frontend deletion

**Decision**: Delete `apps/badman`, `apps/badman-e2e`, `apps/badman-e2e-desktop`, `apps/badman-e2e-mobile`, and all of `libs/frontend/*` (29 libs), plus their Angular/Nx tooling (`@nx/angular`, `@angular-devkit/*`, ng-packagr, Playwright e2e deps if unused elsewhere) and the `scope:legacy` machinery. Update `AGENTS.md`/docs references.

**Rationale**: Clarify Q1 (specify) + FR-014. Shrinks the migration surface (no Angular-on-Turborepo work). Do this **first** in the cutover branch so the remaining graph is backend-only before introducing Turborepo.

**Risk**: the API serves the Angular static bundle in production (per CLAUDE.md). Verify nothing in the API build/serve path hard-requires the built frontend bundle; if it does, remove/guard that static-serving code. Constitution II asset copying is for i18n, not the SPA — unaffected.

---

## D12b — Stage A gotcha: Nx infers tasks from package.json scripts (CONFIRMED in impl)

**Problem (hit on the first Stage A CI run):** in an Nx workspace that defines projects via `project.json`, adding `build`/`test`/`lint` scripts to a project's `package.json` makes Nx infer those scripts as `nx:run-script` targets that **override the real executors** (observed: `utils:test` flipped from `@nx/jest:jest` to `nx:run-script`). `nx affected -t test` then runs the npm script `nx test <proj>`, which re-enters Nx, re-processes the project graph, and fails — surfacing an unrelated nameless project (`projects … have no name provided: scripts`, from the repo-root `scripts/package.json` named `badman_scripts`). All affected lint/test cascade to `No cached ProjectGraph is available`. A stale restored `.nx/cache` made it deterministic in CI while passing locally on a warm cache.

**Fix (required for Stage A coexistence):** every scaffolded `package.json` MUST include `"nx": { "includedScripts": [] }`. This disables Nx npm-script target inference, so `project.json` + plugin executors stay authoritative (parity with `develop`); Turborepo still runs the scripts because Turborepo reads `package.json` `scripts` directly, independent of Nx. Implemented by `scripts/migration/stage-a-scaffold.js`.

**Verification:** `nx run utils:test` → 94 jest tests pass (no re-entry); `nx show projects` → full graph; `turbo run lint --filter=@badman/utils` passes.

**Stage B relevance:** this only matters while Nx and per-package scripts coexist. Once `project.json`/Nx are removed (D11), `includedScripts: []` is irrelevant and SHOULD be dropped so the scripts are the package's real tasks.

## D12c — Stage A gotcha: enabling npm workspaces activates stale per-lib dep pins (CONFIRMED in impl)

**Problem (second Stage A CI failure):** before workspaces, the lib `package.json` `dependencies` blocks were **inert** — Nx resolved everything from the root `node_modules` via `tsconfig.paths`, and npm never installed per-lib deps. Several blocks are **stale** (e.g. `libs/backend/pupeteer` and `libs/backend/generator` pin `@nestjs/common: ^10`, generator pins `@nestjs/config: ^3`, while root is `@nestjs/common@11` / `@nestjs/config@4`). Turning on npm `workspaces` made npm honor those pins and install **nested** `node_modules/@nestjs/common@10` inside those libs. Result: two copies of `@nestjs/common` → `Logger` from root v11 ≠ `Logger` from pupeteer's v10 → `TS2322 … Property 'context' is protected but type 'Logger' is not a class derived from 'Logger'`, failing `worker-sync:test:ci` (it consumes pupeteer's `acceptCookies`/`signIn`).

**Fix (Stage A) — what actually worked:** correct the stale pins **at source** in the lib `package.json`s (pupeteer/generator `@nestjs/common` `^10` → `^11`; generator `@nestjs/config` `^3` → `^4`; `@nestjs/schedule ^6` already matched root) and **commit the regenerated `package-lock.json`**. Value-only nested dups (`file-type`, `lodash`, `dotenv-expand`, `@tokenizer/inflate`) don't break type identity and were left alone.

**Two false starts worth recording (both cost a CI round):**

1. **Root `overrides` did NOT work.** `"overrides": { "@nestjs/common": "^11.0.0" }` did not rewrite the nested workspace entries in `package-lock.json` (`npm install --package-lock-only` reported "up to date" with the nested v10 still present). Correcting the pins at source is the deterministic fix.
2. **The lockfile must be committed.** The first attempt fixed `node_modules` on disk via `npm install` but never staged the changed `package-lock.json`. CI runs **`npm ci`** (strict, lockfile-authoritative), so it kept reinstalling the nested copy. **Always verify Stage A changes with `npm ci`, not `npm install`** — `npm install` mutates/dedupes on the fly and hides lockfile drift that `npm ci` will expose in CI. Verified fix: `npm ci` → no nested `@nestjs/common` on disk → `worker-sync:test` passes (22 suites / 311 tests).

**Stage B relevance:** the real cause is unmaintained lib dep pins. Stage B (D13/FR-021) derives each package's deps from its actual imports, so the stale `^10` pins get corrected and these `overrides` SHOULD be removed. Until then, the overrides are the Stage A guardrail.

## D11 — Nx removal

**Decision**: Remove `nx.json`, every `project.json`, `jest.preset.js`'s Nx import, `.nx/`, all `@nx/*` and `nx` devDependencies, and Nx-specific scripts in root `package.json` (`ng`, `nx`, `start:*` rewritten to `turbo run`). Done last in the cutover, after Turborepo equivalents verified green.

**Rationale**: FR-015, SC-009. Performed in Phase 2 (FR-017), after Turborepo equivalents are verified green via the Phase 1 double-run.

---

## D12 — Migration phasing & double-run verification (official guide)

**Decision**: Two phases per the official [Turborepo "Migrating from Nx" guide](https://turborepo.dev/docs/guides/migrating-from-nx).

- **Phase 1 (incremental coexistence)**: keep Nx, npm, `tsconfig.paths`, and the `apps/`+`libs/` layout untouched. Add `.turbo` to `.gitignore` (guide step 1), add `turbo.json` (step 8) and per-package `build`/`test`/`lint` scripts that initially wrap the existing builders, install Turborepo as a dev dep (step 7). CI **double-runs** the same tasks through both runners (`turbo run lint test` _and_ `nx affected -t lint test`) to confirm identical affected sets and pass/fail before Nx is trusted/removed.
- **Phase 2 (atomic structural cutover)**: the `libs/`→`packages/` move, drop `tsconfig.paths` for `workspace:*` + `exports` (D2), `nest build` (D3), pnpm (D4), CI rewrite to Turborepo-only (D8), and Nx removal (D11) — all in one PR.

**Rationale**: The guide explicitly encourages coexistence ("you will have both Nx and Turborepo in your repository at the same time") and lists three techniques: migrate one task at a time, one package at a time, or double-run. Double-run is the strongest parity check for a 32-package backend. The only step that genuinely cannot coexist is the `tsconfig.paths`↔`workspace:*` resolution swap, so it is isolated to the atomic Phase 2. This revises the earlier single-big-bang decision (clarify Q5) after reading the guide.

**Alternatives**: single big-bang (original Q5) — no incremental parity check; fully incremental per-package — longest dual-tool window. Hybrid chosen.

---

## D13 — Dependency location: install where used (official guide)

**Decision**: Move dependencies from the repo-root `package.json` into the packages/apps that use them. Internal `@badman/*` → `workspace:*` (D2); external runtime/dev deps → each consumer's `package.json`. Root keeps only workspace-root tooling (turbo, release-please, formatters).

**Rationale**: Guide "Advanced migration considerations" — Nx historically installs everything at root; Turborepo prefers per-package deps to "improve cache hit ratios, help dependency pruning capability, and clarify which dependencies are meant for which packages." Derive each package's dep list by scanning its imports (same scan that satisfies VR-2). Can proceed progressively during Phase 1; MUST be complete by Phase 2 (FR-021, SC-014).

**Risk**: large mechanical change across 32 packages; pnpm strictness will surface every missing declaration as a build/test failure (intended — it finds real phantom deps).

---

## D14 — CLI / command equivalents (corrections from guide)

| Nx                             | Turborepo                                         |
| ------------------------------ | ------------------------------------------------- |
| `nx run <t>`                   | `turbo run <t>`                                   |
| `nx run-many … --projects=web` | `turbo run … --filter=web`                        |
| `nx affected -t lint test`     | `turbo run lint test --affected`                  |
| `nx generate`                  | `turbo generate` (if code generators are adopted) |
| `nx reset` (clear cache)       | `turbo … --force` / clear `.turbo`                |
| `--parallel=<n>`               | `--concurrency=<n>`                               |
| `--nxBail`                     | `--continue` (inverse)                            |
| `--graph`                      | `--graph`                                         |
| `--output-style`               | `--log-order`                                     |
| `--verbose`                    | `--verbosity`                                     |

**Note**: today's CI uses `nx affected … --parallel=3`; the Turborepo equivalent is `--concurrency=3` (not `--parallel`). Quickstart and CI contract updated accordingly. The repo makes little/no use of Nx generators, so `turbo generate` adoption is optional.

---

## Cross-cutting: what does NOT change

Sequelize models, GraphQL resolvers, migrations (`database/migrations/`, `sequelize-cli`), Bull queues, Auth0/PermGuard, i18n JSON + `nestjs-i18n` generation, Jest test content, ESLint rules, Prettier, Node 20.19.0, port 5010. This is orchestration + repo-structure only (spec Assumptions).
