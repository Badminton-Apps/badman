# Feature Specification: Switch Monorepo from Nx to Turborepo

**Feature Branch**: `036-nx-to-turborepo`  
**Created**: 2026-06-09  
**Status**: Draft  
**Input**: User description: "I want to switch this from an nx repo to a turborepo monorepo. Don't like NX and it's slow and old. What would that take?"

## Overview

The repository is currently an Nx-managed monorepo (Nx 21.3.7) containing the NestJS API, four Bull-queue workers, ~30 buildable backend/shared TypeScript libraries, and a legacy Angular frontend (app + ~29 libraries + e2e suites) that is reference-only and already excluded from CI. The maintainer wants to replace Nx with Turborepo as the monorepo orchestrator to get a faster, simpler, more modern task runner.

This specification describes the **outcome**: every command a developer or CI pipeline runs today (build, test, lint, serve, migrate, release) continues to work and produces equivalent results, but is orchestrated by Turborepo + the package manager's native workspaces instead of Nx. The legacy Angular frontend is removed as part of this migration (it is reference-only, has no viable Turborepo build path, and is already CI-excluded), shrinking the migration surface to the backend and workers.

The repository also adopts the Turborepo directory convention — deployable apps/workers under `apps/`, shared libraries under `packages/` (the current `libs/` directory is renamed to `packages/`).

Versioning stays commit-driven: a conventional-commit-based release tool auto-generates version bumps and changelogs from commit messages (preserving today's `nx release` behavior), so contributors never hand-author release files.

This is an internal developer-experience and build-infrastructure change. It does not alter any runtime behavior of the deployed API or workers, the GraphQL contract, the database schema, or any user-facing application feature.

## Clarifications

### Session 2026-06-09

- Q: How do apps/workers consume the `@badman/*` packages under Turborepo? → A: **Compiled** — each package builds to `dist` via `tsc`; apps consume built output. Per-package Turborepo cache + build-ordering. Resolution shifts from `tsconfig.paths` to native workspace dependencies (`"@badman/<name>": "workspace:*"`) plus each package's `exports`; `@badman/*` import statements stay unchanged (verified against the installed Turborepo skill's `best-practices/packages.md`, which warns that `tsconfig.paths` breaks under Turborepo internal-package patterns and recommends `tsc`-compiled internal packages for cacheable builds).
- Q: How should the apps/workers build? → A: **`nest build`** (NestJS default builder, tsc/swc under the hood) per app, replacing `@nx/webpack:webpack`. Each app is its own package task consuming the compiled `@badman/*` packages.
- Q: Package manager? → A: **Switch to pnpm** (skill-recommended). Adopt `pnpm-workspace.yaml` with globs `apps/*` + `packages/*`, `workspace:*` dependency syntax, and a pnpm lockfile — replacing npm/`package-lock.json`. CI and Docker images update to pnpm.
- Q: Release versioning granularity? → A: **Single repo-wide version** per release (preserves current `nx release` workspace-version behavior), via a commit-driven tool (release-please or semantic-release) in single-package mode. The deploy workflow's single-tag base resolution is unchanged.
- Q: Cutover strategy? → A: **Single cutover PR** — one branch flips Nx→Turborepo atomically (libs→packages, package.json `exports` + workspace deps, `turbo.json`, pnpm, CI, Nx removal). Avoids running Nx `tsconfig.paths` and Turborepo workspace-dep resolution simultaneously. `develop` stays green because the switch lands as one reviewed merge, not partial commits.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Backend & workers build, test, and lint under Turborepo with full parity (Priority: P1)

A developer clones the repo, installs dependencies, and runs the standard build, test, and lint commands. Every backend library, the API, and all four workers compile, their unit tests run, and linting passes — orchestrated entirely by Turborepo with no Nx involvement. The compiled output of each app/worker is functionally equivalent to the Nx-produced output.

**Why this priority**: This is the core of the migration. Without parity on build/test/lint for the backend and workers, nothing can ship and the platform cannot be developed or deployed. Everything else (caching, CI speed, release tooling) builds on top of this.

**Independent Test**: Check out the migrated branch, run a clean install, then build the API + all four workers and run the full backend test suite. Compare each produced artifact and test outcome against the same commands on the pre-migration `develop` branch — they must match (same passing tests, equivalent runnable bundles).

**Acceptance Scenarios**:

1. **Given** a fresh checkout with no build cache, **When** the developer builds the API, **Then** a runnable API bundle is produced that starts and serves GraphQL identically to the Nx-built bundle.
2. **Given** a fresh checkout, **When** the developer builds all four workers (ranking, sync, belgium-flanders-places, belgium-flanders-points), **Then** each produces a runnable bundle equivalent to its Nx-built counterpart.
3. **Given** a backend library is changed, **When** the developer builds an app that depends on it, **Then** the dependency is rebuilt first and consumed by the app (dependency ordering is respected).
4. **Given** the full backend test suite, **When** the developer runs tests, **Then** the same set of tests execute and pass as before the migration, including coverage reporting.
5. **Given** the codebase, **When** the developer runs lint, **Then** the same lint rules are enforced across all backend/shared projects with equivalent pass/fail results.
6. **Given** the `@badman/*` import aliases used throughout the codebase, **When** any project is built or tested, **Then** those imports resolve correctly with no source changes required to consuming code.

---

### User Story 2 - Local development workflows (serve, watch) work under Turborepo (Priority: P1)

A developer starts the API and a worker in watch/dev mode using the documented start commands and iterates on code with live reload, exactly as they do today with `nx run-many --target=serve`.

**Why this priority**: Day-to-day development is impossible without working dev/serve commands. This is P1 because it blocks all local feature work; a migration that builds in CI but breaks `npm run start:server` is not shippable.

**Independent Test**: Run the documented "serve API + sync worker" command on the migrated branch and confirm both processes start, the API responds to GraphQL queries, and editing a source file triggers a reload.

**Acceptance Scenarios**:

1. **Given** the migrated repo, **When** the developer runs the documented command to serve the API and sync worker in parallel, **Then** both start successfully and serve/process as before.
2. **Given** a running dev server, **When** the developer edits a source file, **Then** the affected process reloads (watch mode works).
3. **Given** the documented worker dev commands, **When** the developer runs them, **Then** the ranking and Belgium-Flanders workers start in dev mode.

---

### User Story 3 - CI pipeline runs only affected work and caches results (Priority: P2)

A pull request triggers CI. The pipeline lints and tests only the projects affected by the change (not the whole repo), reuses cached results for unchanged projects, and completes at least as fast as the current Nx-based PR gate.

**Why this priority**: The maintainer's primary stated motivation is speed. "Affected" filtering and caching are what keep CI fast. It is P2 (not P1) because a correct-but-slower full-run CI is still shippable as an interim state, whereas a broken build (P1) is not.

**Independent Test**: Open a PR touching a single backend library and confirm CI runs lint/test only for that library and its dependents, skips unrelated projects, and reports cache hits on a second identical run.

**Acceptance Scenarios**:

1. **Given** a PR that changes one backend library, **When** CI runs, **Then** only that library and the projects that depend on it are linted and tested; unrelated projects are skipped.
2. **Given** a re-run of CI with no source changes, **When** the pipeline executes, **Then** previously computed task results are served from cache instead of re-executed.
3. **Given** the migrated CI workflow, **When** a PR gate runs, **Then** it completes in no more wall-clock time than the equivalent Nx PR gate on the same change.
4. **Given** the CI workflow, **When** it runs, **Then** the legacy Angular frontend and e2e projects are absent (removed) rather than excluded by name.

---

### User Story 4 - Production/staging deploy and database migrations are unaffected (Priority: P2)

The staging and production deploy workflows build the affected apps, run pending database migrations, and deploy — with the same safety guarantees (migration concurrency lock, prod approval gate) as today.

**Why this priority**: Deploys touch production. They must keep working with identical safety properties. P2 because it depends on P1 build parity being in place first.

**Independent Test**: Trigger the staging deploy workflow on the migrated branch and confirm it builds the affected apps, invokes the shared migration workflow, and deploys without behavior change.

**Acceptance Scenarios**:

1. **Given** the migrated repo, **When** the staging deploy workflow runs, **Then** it builds the affected apps and calls the shared migration workflow exactly as before.
2. **Given** the production deploy workflow, **When** it runs, **Then** the migration concurrency lock and the manual prod-approval gate still apply.
3. **Given** the Sequelize migration runner (`sequelize-cli`), **When** migrations are applied, **Then** the process is unchanged by the Nx→Turborepo switch (it does not depend on the task runner).

---

### User Story 5 - Versioning and releases auto-generated from commit history (Priority: P3)

A maintainer cuts a release. Versions are bumped, a changelog is generated, a git tag and GitHub release are created — derived **automatically from the conventional-commit history** (no hand-written changelog or version entries), replacing the `nx release` conventional-commit flow with an equivalent commit-driven release tool.

**Why this priority**: Release tooling matters but is lower frequency and can be finalized after build/CI parity. P3 because the team can cut a manual release in the interim if needed. Critically, the auto-from-commits behavior must be preserved — contributors must not be required to author release/changelog files by hand.

**Independent Test**: On a test branch with conventional commits (`feat:`, `fix:`), run the release command and confirm the version bump and changelog are computed from those commit messages alone, with no manual entry files added.

**Acceptance Scenarios**:

1. **Given** a series of conventional commits since the last release, **When** the release command runs, **Then** the next version is computed from the commit types (feat → minor, fix → patch, breaking → major) and a changelog is generated from the commit messages — with no hand-authored changelog/version files.
2. **Given** a release is cut, **When** it completes, **Then** a git tag and GitHub release are created equivalent to the current `nx release` output.
3. **Given** the production deploy workflow that consumes the release tag, **When** it runs, **Then** it can still resolve the latest version tag for its affected-build base.
4. **Given** a normal contributor PR, **When** it is merged, **Then** the contributor was not required to add any release-metadata file — the release is driven solely by their commit messages.

---

### User Story 6 - Legacy Angular frontend is removed (Priority: P3)

The legacy Angular application, its ~29 frontend libraries, and the e2e suites are deleted from the repository, along with their Angular/Nx-specific build tooling and config.

**Why this priority**: Removal de-risks and shrinks the migration (no Angular-on-Turborepo work) but is not on the critical path for backend parity, so it can land alongside or just before the cutover. P3.

**Independent Test**: Confirm the `apps/badman`, `apps/badman-e2e*`, and `libs/frontend/*` projects no longer exist and that no remaining backend/worker project references them.

**Acceptance Scenarios**:

1. **Given** the migrated repo, **When** a developer searches for frontend projects, **Then** the legacy Angular app, frontend libraries, and e2e projects are absent.
2. **Given** the removal, **When** the backend/workers are built and tested, **Then** nothing fails due to a missing frontend project (no lingering references).
3. **Given** repo documentation, **When** a developer reads the build/architecture docs, **Then** references to the removed legacy frontend are updated or removed.

---

### Edge Cases

- **Import-alias resolution**: The codebase relies on ~30 `@badman/*` path aliases pointing at library source. The migration must keep these resolving for build, test, lint, and editor tooling without rewriting import statements across the codebase.
- **Build dependency ordering**: Apps depend on multiple buildable libraries which depend on each other. If ordering is not preserved, an app can build against a stale or missing library.
- **Cache correctness**: A task cache that ignores a relevant input (e.g. a shared config or env file) can serve a stale result and mask a real failure. Cache inputs must be scoped so a change that should invalidate a task does.
- **"Affected" base resolution in CI**: PR gates compute affected relative to the base branch; production builds compute it relative to the last release tag. Both base-resolution mechanisms must keep working post-migration.
- **Coverage threshold gate**: The backend coverage threshold is committed and enforced; the test runner must continue to produce coverage and honor the threshold.
- **Partial / interrupted migration**: The cutover is atomic (FR-017) and lives on its own branch; `develop` is never left half-migrated. The risk to manage is instead a _long-lived_ cutover branch drifting from `develop` — the branch must be rebased/kept current so the single merge stays clean.
- **Worker-specific bundling**: Workers are lean apps importing only needed modules; their bundles must remain lean and not accidentally pull in unrelated code after the build-tool swap.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST build the API and all four workers (ranking, sync, belgium-flanders-places, belgium-flanders-points) under Turborepo via `nest build` (NestJS default builder) per app — replacing `@nx/webpack:webpack` — producing artifacts functionally equivalent to the current Nx-produced artifacts (the app starts, serves/processes identically). Each app consumes the compiled `@badman/*` packages.
- **FR-002**: The system MUST build all backend and shared TypeScript libraries currently consumed by the apps/workers as **compiled internal packages** (each emits to its own `dist` via `tsc`), respecting inter-package build dependency order (`build` depends on `^build`), with each package's `dist` registered as a cacheable task output.
- **FR-003**: The system MUST run the existing backend/shared unit test suites under Turborepo with the same set of tests and the same pass/fail outcomes as before migration, including coverage reporting and the committed coverage threshold gate.
- **FR-004**: The system MUST run linting for all retained projects with the same rules and equivalent results as the current Nx lint.
- **FR-005**: The `@badman/*` imports MUST continue to resolve for build, test, lint, and IDE tooling without requiring changes to import statements in consuming code. Resolution moves from Nx `tsconfig.paths` to native workspace dependencies (each consumer declares `"@badman/<name>": "*"`) plus each package's `exports` map; the import specifiers themselves are unchanged because each package's name equals its current alias.
- **FR-006**: The system MUST support local development (serve/watch) of the API and workers via documented commands equivalent to the current `nx run-many --target=serve` workflows, including live reload.
- **FR-007**: CI MUST execute lint/test only for projects affected by a change plus their dependents, and MUST skip unaffected projects.
- **FR-008**: CI MUST reuse cached task results for unchanged projects/inputs and recompute only when relevant inputs change.
- **FR-009**: Task caching MUST scope inputs correctly so that a change which should invalidate a task does invalidate it (no stale-cache false passes).
- **FR-010**: The staging and production deploy workflows MUST continue to build affected apps, invoke the shared database-migration workflow, and preserve existing safety guarantees (migration concurrency lock, production manual-approval gate).
- **FR-011**: The database migration process (`sequelize-cli`) MUST be unaffected by the task-runner change.
- **FR-012**: Versioning and release MUST be derived automatically from the conventional-commit history (commit types determine the version bump; changelog is generated from commit messages), producing a **single repo-wide version** bump, a changelog, a git tag, and a GitHub release equivalent in effect to the current `nx release` flow. Contributors MUST NOT be required to hand-author any release-metadata or changelog file per change.
- **FR-013**: The production deploy's "affected since last release" base resolution MUST continue to work with the new commit-driven release tagging.
- **FR-014**: The legacy Angular application (`apps/badman`), its frontend libraries (`libs/frontend/*`), and the e2e suites (`apps/badman-e2e*`) MUST be removed from the repository, along with their Angular/Nx-specific tooling and configuration, with no dangling references from retained projects.
- **FR-015**: All Nx-specific configuration, executors, plugins, and tooling MUST be removed once migration is complete, leaving Turborepo + native package-manager workspaces as the sole orchestrator. No `nx` dependency or `nx.json`/`project.json` files remain.
- **FR-016**: Repository documentation that describes build, test, serve, CI, and architecture commands MUST be updated to reflect the Turborepo workflows and the removal of the legacy frontend.
- **FR-017**: The migration MUST land as a **single atomic cutover** on a dedicated branch (Nx and Turborepo MUST NOT both drive resolution at the same time): the `libs/`→`packages/` move, package `exports` + workspace deps, `turbo.json`, pnpm adoption, CI rewrite, and Nx removal flip together. `develop` MUST stay green by merging the cutover as one reviewed PR rather than partial commits that leave the repo half-migrated.
- **FR-020**: The repository MUST use pnpm as its package manager and workspace provider: a `pnpm-workspace.yaml` declaring `apps/*` and `packages/*`, `workspace:*` internal-dependency syntax, a pnpm lockfile (replacing `package-lock.json`), and CI/Docker build images updated to pnpm. No npm `package-lock.json` or npm-workspaces config remains.
- **FR-018**: Local task caching MUST be in place as a direct replacement for the current Nx local cache. Shared/remote caching is out of scope for this migration (no Nx Cloud is currently in use); it MAY be adopted later without blocking this work.
- **FR-019**: The repository MUST adopt the Turborepo directory convention: deployable/runnable units (API, the four workers) live under `apps/`, and all shared libraries live under `packages/`. The current `libs/` directory MUST be renamed/moved to `packages/`, with the workspace globs, each package's `package.json` (name = current `@badman/*` alias, plus `exports`), consumers' workspace dependency declarations, and any config references updated accordingly. The rename MUST NOT require changes to `@badman/*` import statements in consuming source code (per FR-005).

### Key Entities _(include if feature involves data)_

- **Workspace project**: A buildable/testable unit (app, worker, or library) declared as a native package-manager workspace member with its own scripts and task pipeline entry. Replaces the Nx `project.json` unit. Deployables live under `apps/`; shared libraries under `packages/`.
- **Task pipeline**: The declared graph of tasks (build, test, lint, serve) and their dependencies and cache inputs/outputs, owned by Turborepo configuration. Replaces Nx `targetDefaults` + `namedInputs`.
- **Import alias**: The `@badman/<name>` → library-source mapping used across the codebase; must be preserved.
- **Release**: A version bump + changelog + tag + GitHub release, computed automatically from the conventional-commit history by the release tool. Replaces the `nx release` mechanism while keeping its commit-driven, no-manual-entry behavior.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of retained projects (API, 4 workers, all consumed backend/shared libraries) build successfully under Turborepo.
- **SC-002**: The backend/shared test suite has the same number of passing tests as the pre-migration `develop` baseline (zero net test loss), and the coverage threshold gate still enforces.
- **SC-003**: A clean (cold-cache) full build + test of the backend and workers completes in no more wall-clock time than the equivalent Nx run on the same machine; a warm-cache re-run with no changes completes in under 30 seconds (near-instant cache hits).
- **SC-004**: A PR touching a single library triggers CI work for only that library and its dependents; unrelated projects show zero executed tasks.
- **SC-005**: The PR CI gate completes in no more wall-clock time than the current Nx-based gate on an equivalent change (and ideally faster — the stated motivation).
- **SC-006**: Staging and production deploys succeed on the migrated branch with database migrations applied and all existing safety gates intact (zero regressions in deploy behavior).
- **SC-007**: A release run produces a version bump, changelog, git tag, and GitHub release computed entirely from commit history, with no hand-authored release files and no manual fix-up required.
- **SC-008**: Zero `@badman/*` import statements in retained code require modification for resolution to work.
- **SC-009**: After migration, the repository contains no `nx` runtime dependency, no `nx.json`, and no `project.json` files; `npx nx` is no longer a prerequisite for any documented workflow.
- **SC-010**: The legacy Angular app, frontend libraries, and e2e projects are fully removed, and a full backend/worker build+test passes with no dangling references.
- **SC-011**: All shared libraries reside under `packages/` and all deployable units under `apps/`; no `libs/` directory remains, and a full build+test passes after the move with zero `@badman/*` import-statement changes.
- **SC-012**: The repository builds and installs via pnpm only — no `package-lock.json` or npm-workspaces config remains, and CI/Docker use pnpm.
- **SC-013**: The Nx→Turborepo switch merges as a single PR after which `develop` is green; no intermediate commit on the branch leaves the repo unbuildable due to dual-tool resolution.

## Assumptions

- The package manager moves from npm to **pnpm** (maintainer-selected, skill-recommended). pnpm workspaces (`pnpm-workspace.yaml`, `workspace:*` deps) are the basis for resolution under Turborepo; the npm `package-lock.json` is replaced by a pnpm lockfile. Node 20.19.0 is retained. This is a deliberate scope inclusion of the migration, not a separate effort.
- The legacy Angular frontend is reference-only and safe to delete; the active frontend lives in a separate repository (per repo guidance) and is unaffected by this change.
- No Nx Cloud / Nx remote cache is currently configured (confirmed: no access token in `nx.json` or CI), so no shared-cache replacement is required for parity. Turborepo's local cache replaces the Nx local cache; Turborepo Remote Cache is an optional future enhancement.
- Versioning stays commit-driven (maintainer-selected): a conventional-commit-based release tool (e.g. semantic-release or release-please) auto-derives the version bump and changelog from commit messages, preserving the current `nx release` behavior. Changesets was explicitly rejected because it requires contributors to hand-author changeset files. Specific tool choice is deferred to planning.
- Runtime behavior of the API and workers, the GraphQL contract, the database schema, and Sequelize migrations are out of scope and must not change — this is purely a build-orchestration and repo-structure change.
- The existing test runner (Jest) and linter (ESLint) are retained as the underlying tools; only their orchestration moves from Nx executors to per-package scripts run by Turborepo. App/worker bundling moves from `@nx/webpack:webpack` to `nest build`; internal libraries compile with `tsc`.
- Releases cut a single repo-wide version (not per-package), preserving the current `nx release` workspace-version model and the deploy workflow's single-tag base resolution.
- The migration ships as one atomic cutover PR; Nx and Turborepo are not run side-by-side.
- CI continues to run on GitHub Actions; the migration adapts existing workflows rather than changing the CI provider.
- "Equivalent artifact" means functionally equivalent (starts, serves, processes the same), not byte-identical, since bundler/tooling configuration may differ.
