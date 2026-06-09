# Tasks: Switch Monorepo from Nx to Turborepo

**Input**: Design documents from `specs/036-nx-to-turborepo/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: No new test code is written for this migration. The existing Jest suites ARE the test of parity (FR-003); tasks below run them, they do not author them.

## Migration stages vs. user stories

This feature is a **sequential infrastructure migration**, not a set of independently shippable stories. The phased rollout (FR-017) is the real structure:

- **Stage A — Coexistence (one PR to `develop`)**: add Turborepo over the existing Nx structure; CI double-runs both to prove parity. Nothing is removed. Low risk, reversible.
- **Stage B — Atomic cutover (one PR to `develop`)**: structural change — delete legacy FE, pnpm, `libs/`→`packages/`, drop `tsconfig.paths`, `nest build`, CI rewrite, release-please, remove Nx. The `tsconfig.paths`↔`workspace:*` conflict lives only here, so it lands atomically.

User-story labels (`[US1]`…`[US6]`) are kept for traceability to [spec.md](spec.md), but stories are **not** independently deliverable — US3/US4/US5 depend on US1's build parity. The MVP is "Stage A merged + US1 build/test parity proven."

> **PROGRESS (2026-06-10):**
>
> - **Stage A — MERGED to `develop`.** Turborepo coexists with Nx; double-run is `--dry` affected-set parity (non-blocking). Gotchas D12b/D12c recorded.
> - **Stage B — IN PROGRESS on branch `feat/036-turborepo-stage-b`.** Wave 1 done + pushed: legacy frontend deleted (T010/T011/T014). **Next up = the intertwined pnpm + `libs/`→`packages/` + drop-`tsconfig.paths` core (T015–T026)** — must land together because internal deps are pinned `"@badman/x":"6.187.0"` (unpublished), so pnpm install only works once they become `workspace:*` in real package members.
> - **Verification rule (hard-won):** verify with the EXACT CI commands from a clean `npm ci`/`pnpm install --frozen-lockfile` + full `nx`/`turbo` run — never `npm install` or a filtered subset. Stale `node_modules` and empty `nx affected` sets have produced false greens twice.

**High-risk packages** (call out during per-package tasks): `backend-graphql` (largest, most internal deps), `backend-database` (depended on by everything), `backend-twizzit` (`node-adodb` native external), `backend-translate` (ships i18n assets — Constitution II), `backend-competition/*` + `backend-belgium/flanders/*` (nested dirs, flat aliases).

---

## Phase 1: Setup — Stage A coexistence scaffolding

**Purpose**: Introduce Turborepo alongside Nx without changing structure or removing anything.

- [x] T001 Add `.turbo` to `.gitignore` at repo root (FR-022)
- [x] T002 Install Turborepo as a root devDependency (`turbo`) and add `packageManager` field to root `package.json` (still npm at this stage)
- [x] T003 Create root `turbo.json` per [contracts/turbo-pipeline.md](contracts/turbo-pipeline.md) with `build`/`test`/`lint`/`dev` tasks (`build`/`test`/`lint` → `dependsOn: ["^build"]`, `build` outputs `dist/**`, `test` outputs `coverage/**`, `dev` `cache:false persistent:true`); add `globalDependencies: ["tsconfig.base.json", ".nvmrc"]`
- [x] T004 Add a `build`/`test`/`lint` script to each `apps/*` and `libs/**` `package.json` (create the file where only `project.json` exists) that **wraps the existing Nx builder** (e.g. `"build": "nx build <project>"`), so both runners produce identical output during Stage A. **CRITICAL (research D12b):** each manifest MUST also set `"nx": { "includedScripts": [] }` — otherwise Nx infers the npm scripts as `nx:run-script` targets, overrides the real executors, and `nx affected` re-enters Nx and breaks the project graph (this failed the first CI run). Done via `scripts/migration/stage-a-scaffold.js`.
- [x] T005 Verify the Turborepo task graph matches the Nx graph: `npx turbo run build --dry=json` lists every non-legacy project with correct `^build` ordering; reconcile any missing internal-dependency edges

**Checkpoint**: `npx turbo run build` and `npx turbo run test` succeed locally with the same results as `nx run-many`.

---

## Phase 2: Foundational — Stage A double-run parity gate

**Purpose**: Prove Turborepo selects the same affected set and pass/fail as Nx in CI before trusting it (FR-017, SC-013). Blocks Stage B.

- [x] T006 Update `pull-request.yml` to **double-run**: keep the authoritative `nx affected -t lint test` line, add a non-blocking `npx turbo run lint test --affected --continue` line (see [contracts/ci-workflow.md](contracts/ci-workflow.md) "Phase 1")
- [x] T007 Cache `.turbo` in the `setup-monorepo` composite action via `actions/cache` (key on lockfile + ref), alongside the existing `.nx/cache` step (FR-008)
- [ ] T008 Open a throwaway PR touching exactly one library; confirm Turborepo and Nx report the **same affected packages** and **same pass/fail** (SC-013). Record the parity evidence in the Stage A PR description
- [ ] T009 Open a second PR touching one app; confirm parity again, including a warm-cache re-run showing Turborepo cache hits (SC-003)

**Checkpoint (Stage A complete)**: merge the Stage A PR to `develop`. Turborepo runs in CI (non-authoritative), Nx still authoritative, repo otherwise unchanged. **This is the MVP.**

---

## Phase 3 (US6, P3): Delete legacy Angular frontend — Stage B begins

**Story goal**: Repo becomes backend-only (FR-014, Principle V v2.0.0). Done first in Stage B to shrink the surface (research D10).

**Independent test**: `apps/badman*` and `libs/frontend/*` absent; backend build+test green; no dangling references.

- [x] T010 [US6] Delete `apps/badman`, `apps/badman-e2e`, `apps/badman-e2e-desktop`, `apps/badman-e2e-mobile`, and all `libs/frontend/*` (29 libs) — done (Stage B Wave 1, commit on `feat/036-turborepo-stage-b`, −76.6k lines)
- [x] T011 [P] [US6] Remove their `@badman/frontend-*` entries from `tsconfig.base.json` `paths` and any references in remaining configs — done (29 paths stripped, 33 backend paths remain)
- [ ] T012 [P] [US6] Remove Angular/Nx-frontend devDependencies (`@nx/angular`, `@angular-devkit/*`, `ng-packagr`, Playwright e2e deps if unused elsewhere) from root `package.json` — **DEFERRED**: harmless-but-unused now; prune during the pnpm step (T016) with a clean `npm ci`/`pnpm install` verify, alongside `@nx/*` removal (T050)
- [ ] T013 [US6] Delete `scripts/ci/legacy-projects.js` and remove the `scope:legacy` resolve step + `--exclude` from all workflows (FE no longer exists to exclude) — **DEFERRED to Phase 6 CI rewrite (T038)**: script left in place, now returns empty so existing workflows still pass
- [x] T014 [US6] Verify the API still boots and serves with the frontend bundle removed — done: `ServeStaticModule` guarded with `existsSync(staticFrontendRoot)` in `apps/api/src/app/app.module.ts` (serves a bundle only if present, no-op otherwise); i18n assets untouched (Constitution II); `nx build api` green

**Checkpoint**: backend builds + tests green with zero frontend projects.

---

## Phase 4 (US1, P1): Build & test parity under Turborepo — the structural cutover

**Story goal**: API + 4 workers + all backend/shared packages build, test, lint under Turborepo with parity (FR-001–005, FR-019–021). This is the bulk of Stage B and must land atomically.

**Independent test**: clean install → build api + 4 workers → full backend test suite; results match pre-migration `develop`.

### 4a — Package manager: pnpm (FR-020)

- [ ] T015 [US1] Add `pnpm-workspace.yaml` with globs `apps/*`, `apps/worker/*`, `apps/worker/belgium/flanders/*`, `packages/*`, `packages/backend-competition/*`, `packages/backend-belgium/flanders/*`, `config/*` (see [contracts/package-manifest.md](contracts/package-manifest.md))
- [ ] T016 [US1] Pin pnpm in root `package.json` `packageManager`; delete `package-lock.json`; generate `pnpm-lock.yaml` via `pnpm install`
- [ ] T017 [US1] Convert root `package.json` scripts to delegate to `turbo run` (`build`/`test`/`lint`/`dev`, `start:server`, `start:ranking`); drop `ng`/`nx`/`start:stackblitz`

### 4b — Shared config packages (research D7, structure best-practice)

- [ ] T018 [P] [US1] Create `config/typescript-config` package (`@badman/typescript-config`) exporting `base.json` + `library.json` (emit `dist`, `declaration`+`declarationMap`); seed from current `tsconfig.base.json` compiler options
- [ ] T019 [P] [US1] Create `config/eslint-config` package (`@badman/eslint-config`) exporting the shared flat config from current root `eslint.config.mjs`; drop `@nx/eslint-plugin` rules

### 4c — Convert libraries to compiled packages (per package; VR-1…VR-6)

- [ ] T020 [US1] For EACH library, add `package.json` per [contracts/package-manifest.md](contracts/package-manifest.md): `name` = current `@badman/*` alias (VR-1), `exports` → `dist`, `build`/`test`/`lint` scripts, `type:"commonjs"`
- [ ] T021 [US1] For EACH library, add a `tsconfig.json` extending `@badman/typescript-config/library.json` that emits `dist` with `declaration`+`declarationMap` (VR-4); keep `tsconfig.spec.json` for tests
- [ ] T022 [US1] For EACH library, derive direct dependencies by scanning its imports and declare them in `package.json`: internal `@badman/*` as `workspace:*` (VR-2), external (nestjs, sequelize, …) moved from root (FR-021, SC-014); pay special attention to `backend-twizzit` → `node-adodb` and `backend-graphql`'s large internal-dep fan-out
- [ ] T023 [US1] `git mv libs/backend/* libs/utils → packages/*` preserving the nested `backend-competition/*` and `backend-belgium/flanders/*` layout (history-preserving move); update `coverageDirectory` paths in each `jest.config.ts` to `packages/...`
- [ ] T024 [US1] Remove ALL `@badman/*` entries from `tsconfig.base.json` `paths` (VR-3); confirm `grep '@badman' tsconfig.base.json` is empty
- [ ] T025 [US1] Replace `jest.preset.js` `@nx/jest/preset` import with a plain preset object reproducing transform/testEnvironment/moduleFileExtensions + existing `forceExit`, `maxWorkers:2`, `setupFiles` (research D6); replace root `jest.config.ts` (`getJestProjectsAsync`) with explicit `projects` or rely on per-package `turbo run test`
- [ ] T026 [US1] `pnpm install` then `pnpm turbo run build` cold — resolve every pnpm strict phantom-dependency error by adding the missing dep to the offending package (VR-2); confirm acyclic graph (VR-6)

### 4d — Convert apps to `nest build` (research D3)

- [ ] T027 [US1] For EACH app (api + 4 workers), add `package.json` (`build: "nest build"`, `dev: "nest start --watch"`, `test`, `lint`, `deploy`) + `nest-cli.json`; declare each app's `@badman/*` and external deps (FR-021)
- [ ] T028 [US1] Port webpack asset copying to `apps/api/nest-cli.json` `compilerOptions.assets`: `apps/api/src/assets`, `packages/backend-translate/assets`→`assets`, `packages/backend-competition/assembly/src/compile`→`compile/libs/assembly`, `packages/backend-mailing/src/compile`→`compile/libs/mailing` (Constitution II + compile features); keep `outDir` at `dist/apps/<name>`
- [ ] T029 [US1] Confirm `node-adodb` (was a webpack external) resolves at runtime under `nest build` for `backend-twizzit`; adjust if the worker that uses it needs a bundled start (research D3 open item)
- [ ] T030 [US1] Delete each app's `webpack.config.js` and `project.json`; verify `pnpm turbo run build --filter=api` and each worker produces a runnable bundle that starts (FR-001)

### 4e — Verify parity

- [ ] T031 [US1] Run full `pnpm turbo run test`; confirm same passing-test count as pre-migration baseline and coverage threshold still enforces (FR-003, SC-002)
- [ ] T032 [US1] Run `pnpm turbo run lint`; confirm equivalent results (FR-004)
- [ ] T033 [US1] Confirm zero `@badman/*` import-statement edits were needed across the codebase (SC-008); warm-cache re-run of build < 30s (SC-003)

**Checkpoint**: backend fully builds/tests/lints under Turborepo+pnpm; Nx no longer needed for these.

---

## Phase 5 (US2, P1): Local dev / serve parity

**Story goal**: serve + watch work via documented commands (FR-006).

**Independent test**: run the documented serve command; API responds on 5010; editing a file reloads.

- [ ] T034 [US2] Verify `pnpm dev --filter=api --filter=worker-sync` starts both with watch reload (FR-006); fix any `nest start --watch` config gaps
- [ ] T035 [P] [US2] Verify ranking + belgium-flanders worker dev commands start in watch mode
- [ ] T036 [P] [US2] Update [quickstart.md](quickstart.md) command table if any serve invocation differs from documented

**Checkpoint**: day-to-day dev loop works without Nx.

---

## Phase 6 (US3, P2): CI affected + cache (Turborepo-only)

**Story goal**: PR/deploy CI runs affected-only over Turborepo+pnpm, caching results (FR-007, FR-008).

**Independent test**: PR touching one package runs only it + dependents; warm re-run shows cache hits.

- [ ] T037 [US3] Rewrite `setup-monorepo` action: pnpm (`pnpm/action-setup` + `setup-node` `cache:pnpm`, `pnpm install --frozen-lockfile`), cache `.turbo`, remove `nrwl/nx-set-shas` and `.nx/cache` (see [contracts/ci-workflow.md](contracts/ci-workflow.md))
- [ ] T038 [US3] Rewrite `pull-request.yml` to `pnpm turbo run lint test --affected` (drop the Nx line + double-run; build stays excluded from PR gate)
- [ ] T039 [US3] Confirm `--concurrency` replaces the old `--parallel=3` where concurrency limiting is wanted (research D14)
- [ ] T040 [US3] Verify affected scoping (SC-004) and cache hit on re-run (SC-005) on a real PR
- [ ] T040b [US3] Verify cache-input correctness (FR-009): edit one library's source, run `pnpm turbo run build`, confirm that library **and its dependents** rebuild while unrelated packages stay cached; edit a shared input declared in `globalDependencies` (e.g. `tsconfig.base.json`) and confirm the expected broad invalidation — guards against stale-cache false passes

**Checkpoint**: PR gate is Turborepo-only and at least as fast as the Nx gate.

---

## Phase 7 (US4, P2): Deploy + migrations unaffected

**Story goal**: staging/prod deploy builds affected, runs migrations, preserves safety gates (FR-010, FR-011, FR-013).

**Independent test**: staging deploy builds affected apps, calls shared migrate workflow, deploys.

- [ ] T041 [US4] Rewrite `deploy-staging.yml` to `pnpm turbo run lint test build --affected`; keep the `_shared-migrate.yml` call UNCHANGED (concurrency lock intact)
- [ ] T042 [US4] Rewrite `deploy-production.yml` affected base: keep the `git describe --match 'v*'` step but export `TURBO_SCM_BASE`/`TURBO_SCM_HEAD` and run `pnpm turbo run … --affected` (FR-013); keep prod approval gate via `_shared-migrate.yml` (FR-010)
- [ ] T043 [US4] Replace `nx run-many -t deploy --all` with `pnpm turbo run deploy` (each app's `deploy` script runs `scripts/render.js --app=<name>`)
- [ ] T044 [US4] Update the **Render.com dashboard** build command for api + 4 workers to `corepack enable && pnpm install --frozen-lockfile && pnpm turbo run build --filter=<svc>` (external, out-of-band — research/plan flag); confirm start path `dist/apps/<svc>/main.js` unchanged
- [ ] T045 [US4] Confirm `npx sequelize-cli db:migrate` is unchanged and unaffected (FR-011)

**Checkpoint**: staging deploy succeeds end-to-end with migrations + gates.

---

## Phase 8 (US5, P3): Release via release-please (single repo-wide version)

**Story goal**: commit-driven single-version release replaces `nx release` (FR-012, FR-013, SC-007).

**Independent test**: conventional commits → version bump + changelog + tag + GitHub release, no hand-authored files.

- [ ] T046 [US5] Add `release-please-config.json` + `.release-please-manifest.json` configured for a single repo-wide version (`release-type: node`/`simple`, one component) (research D9)
- [ ] T047 [US5] Add a release workflow using `googleapis/release-please-action`; remove the `nx release` step from `deploy-production.yml`
- [ ] T048 [US5] Wire the release tag so `deploy-production.yml`'s `git describe --match 'v*'` base resolution still finds the latest version (FR-013); document the chosen trigger (release-PR-merge vs push)
- [ ] T049 [US5] Dry-run on a test branch: conventional commits produce the expected bump + changelog with no manual files (SC-007)

**Checkpoint**: releases are commit-driven and single-version.

---

## Phase 9: Polish & cross-cutting (finish Stage B)

**Purpose**: remove Nx entirely, sync docs/governance, finalize.

- [ ] T050 Remove Nx: delete `nx.json`, all `project.json`, `.nx/`, every `@nx/*` and `nx` devDependency; confirm `npx nx` is no longer referenced anywhere (FR-015, SC-009)
- [ ] T051 [P] Confirm per-package dependency ownership: root `package.json` holds only workspace-root tooling (turbo, release-please, prettier); no app/lib runtime deps remain at root (FR-021, SC-014)
- [ ] T052 [P] Rewrite `AGENTS.md` (CLAUDE.md symlink): Nx→Turborepo command surface, build/test/serve instructions, `packages/` layout, remove legacy-frontend sections — resolves the constitution v2.0.0 Sync Impact Report "pending" item (FR-016, Constitution governance)
- [ ] T053 [P] Update `docs/` references that mention `nx`, `libs/`, or the legacy frontend (FR-016)
- [ ] T054 [P] Add a `docs/tech-debt.md` entry for any deferred item (e.g. remote cache not adopted — FR-018; optional `turbo generate` not set up — research D14)
- [ ] T055 Final full verification: clean checkout → `pnpm install` → `pnpm build` → `pnpm test` → `pnpm lint` all green; `develop` mergeable with no mixed-resolution state (SC-001, SC-010, SC-013)
- [ ] T056 `prettier --check .` passes (Constitution formatting gate)

**Checkpoint (Stage B complete)**: single atomic cutover PR ready to merge; Turborepo-only repo.

---

## Dependencies & execution order

```
Stage A (one PR):  Phase 1 (T001–T005) → Phase 2 (T006–T009) → merge [MVP]
Stage B (one PR):  Phase 3 US6 (T010–T014)          ← do first, shrinks surface
                     → Phase 4 US1 (T015–T033)        ← the core; 4a pnpm → 4b config → 4c libs → 4d apps → 4e verify
                       → Phase 5 US2 (T034–T036)
                       → Phase 6 US3 (T037–T040)
                       → Phase 7 US4 (T041–T045)
                       → Phase 8 US5 (T046–T049)
                         → Phase 9 polish (T050–T056) → merge
```

**Hard sequencing**: 4a (pnpm) before 4c/4d (workspace deps need pnpm); 4c (packages built) before 4d (apps consume them) and before 4e/US3/US4/US5. US6 independent but scheduled first. Within Phase 4c, `backend-database` and `backend-graphql` are central — convert leaf packages first, them last.

**Parallelizable [P]**: T011/T012, T018/T019, T035/T036, T051/T052/T053/T054. The 32-package conversions in 4c are mechanically parallel but share `tsconfig.base.json`/lockfile edits, so batch-then-install rather than truly concurrent.

## Implementation strategy

- **MVP = Stage A** (Phases 1–2): Turborepo proven at parity in CI, zero risk, reversible. Ship it, live with it briefly.
- **Stage B** is one atomic PR (Phases 3–9). Keep the branch rebased on `develop`. Do not merge partially — the `tsconfig.paths`↔`workspace:*` switch must not hit `develop` half-done (FR-017).
- Land the **constitution v2.0.0** amendment + **AGENTS.md rewrite** (T052) inside the Stage B PR (governance requires them consistent in the same PR).
