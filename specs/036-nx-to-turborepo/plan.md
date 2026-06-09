# Implementation Plan: Switch Monorepo from Nx to Turborepo

**Branch**: `036-nx-to-turborepo` | **Date**: 2026-06-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/036-nx-to-turborepo/spec.md`

## Summary

Replace Nx (21.3.7) as the monorepo orchestrator with Turborepo + pnpm workspaces, scoped to the backend: the NestJS API and four Bull workers (`apps/`) plus 32 backend/shared libraries that become compiled internal packages (`packages/`). The ~29 legacy Angular frontend libraries, the Angular app, and the e2e suites are deleted. Versioning moves from `nx release` to a commit-driven, single-repo-wide release tool. The whole switch lands as one atomic cutover PR so `develop` is never half-migrated.

Technical approach (from clarifications + research): each library compiles with `tsc` to its own `dist` and is consumed via pnpm `workspace:*` dependencies + a `package.json` `exports` map (Nx `tsconfig.paths` are dropped; `@badman/*` import specifiers are unchanged because each package name equals its current alias). Apps build with `nest build` (replacing `@nx/webpack:webpack`), with asset copying (i18n, compile templates) moved into `nest-cli.json`. A single root `turbo.json` declares the `build`/`test`/`lint`/`dev`/`deploy` task pipeline with `dependsOn: ["^build"]` and `dist/**` outputs for caching. CI swaps `nx affected` for `turbo run … --affected` over pnpm, caching `.turbo` like it cached `.nx/cache`. Jest and ESLint are retained as tools; only their orchestration (`@nx/jest` preset, `@nx/eslint` executor) is replaced with per-package configs.

**This migration swaps a constitution-load-bearing stack item (Monorepo: Nx) and therefore REQUIRES a MAJOR constitution amendment as a companion change — see Constitution Check + Complexity Tracking.**

## Technical Context

**Language/Version**: TypeScript ~5.x on Node 20.19.0 (`.nvmrc`), NestJS on Fastify.
**Primary Dependencies**: Turborepo (orchestrator, replaces Nx), pnpm (package manager + workspaces, replaces npm), `nest build` (app bundler, replaces `@nx/webpack:webpack`), `tsc` (library compiler), Jest + ts-jest (retained, preset replaced), ESLint flat config (retained, executor replaced), release-please (versioning, replaces `nx release`) — see research.
**Storage**: PostgreSQL via Sequelize; multi-schema. **Unaffected** by this change (migrations run via `sequelize-cli`, independent of the task runner).
**Testing**: Jest per package (`jest.config.ts` per package, plain ts-jest preset replacing `@nx/jest/preset`); `RUN_INTEGRATION_TESTS=1` gate retained; coverage threshold gate retained.
**Target Platform**: Linux (GitHub Actions CI; Render.com runtime for API + workers).
**Project Type**: Backend monorepo (NestJS API + Bull workers + shared TS libraries). No frontend in scope after deletion.
**Performance Goals**: Cold full build+test ≤ current Nx wall-clock; warm no-change re-run < 30s (cache hits); PR gate ≤ current Nx gate (SC-003/005).
**Constraints**: `develop` stays green (atomic cutover, FR-017); zero `@badman/*` import-statement edits (FR-005); deploy safety gates preserved (FR-010); asset copying preserved in app bundles.
**Scale/Scope**: 5 deployables (api + 4 workers) + 32 internal packages migrated; 29 frontend libs + app + 3 e2e projects deleted; 3 GitHub workflows rewritten; 1 composite action + 1 CI script rewritten/removed; 1 external Render build-command change.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Constitution v1.1.0. Result: **CONDITIONAL — requires a MAJOR constitution amendment merged with (or before) this feature.** Rationale below; tracked in Complexity Tracking.

| Principle / Constraint                                                        | Status                      | Notes                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tech Stack: "Monorepo: Nx workspace; libs imported as `@badman/<name>`"**   | ⚠️ **VIOLATION (intended)** | This feature swaps Nx→Turborepo. The constitution states this stack item "MUST NOT be swapped without a MAJOR amendment." `@badman/<name>` import naming is **preserved**. Requires amendment (MAJOR).                                         |
| **Tech Stack: "Tests: Jest … `nx test <lib>`"**                               | ⚠️ Partial                  | Jest retained; only the invocation changes (`turbo run test`). Amendment updates the command wording.                                                                                                                                          |
| **Tech Stack: "Formatting: Prettier"**                                        | ✅                          | Unchanged.                                                                                                                                                                                                                                     |
| **Dev Workflow: `nx run-many … serve`, `nx affected:test`, `nx lint`**        | ⚠️ Partial                  | Commands change to `turbo run …`. Amendment + AGENTS.md update required.                                                                                                                                                                       |
| **Principle V — Legacy Frontend Boundary (NON-NEGOTIABLE)**                   | ⚠️ Reframed                 | Principle says legacy FE "exists only as a reference" and forbids new work. This feature **deletes** it (consistent with "do not invest"), but removes the referenced code. Amendment should retire Principle V or mark the legacy FE removed. |
| **I. Code-First GraphQL / III. Transactional Mutations / IV. Resolver Tests** | ✅                          | No runtime/resolver/model/test-logic changes. Test _orchestration_ changes; test _content_ and patterns are untouched.                                                                                                                         |
| **II. Translation Discipline (NON-NEGOTIABLE)**                               | ✅                          | No `all.json` edits. `nestjs-i18n` type generation + asset copying preserved (moved to `nest-cli.json` assets). `i18n.generated.ts` untouched.                                                                                                 |
| **Migrations / Auth / Queues / Workers**                                      | ✅                          | Unaffected by orchestrator swap.                                                                                                                                                                                                               |

**Gate decision**: Proceed to Phase 0/1 planning. The single hard gate before _merge_ is the constitution amendment (run `/speckit.constitution` for a MAJOR bump: update Tech Stack monorepo entry to Turborepo+pnpm, refresh Dev Workflow commands, retire/adjust Principle V, sync `AGENTS.md`). Implementation may proceed in parallel; merge is blocked until the amendment lands.

## Project Structure

### Documentation (this feature)

```text
specs/036-nx-to-turborepo/
├── plan.md              # This file
├── research.md          # Phase 0 output — tool decisions
├── data-model.md        # Phase 1 output — workspace package graph
├── quickstart.md        # Phase 1 output — post-migration dev commands
├── contracts/           # Phase 1 output — pipeline / package / CI contracts
│   ├── turbo-pipeline.md
│   ├── package-manifest.md
│   └── ci-workflow.md
└── tasks.md             # /speckit.tasks output (NOT created here)
```

### Source Code (repository root — after migration)

```text
apps/
├── api/                         # nest build; nest-cli.json carries assets (i18n, compile/*)
└── worker/
    ├── ranking/
    ├── sync/
    └── belgium/flanders/
        ├── places/
        └── points/

packages/                        # was libs/backend/* + libs/utils — compiled internal packages
├── utils/                       # @badman/utils
├── backend-database/            # @badman/backend-database
├── backend-graphql/             # @badman/backend-graphql
├── backend-authorization/       # @badman/backend-authorization
├── backend-queue/  backend-ranking/  backend-translate/  backend-search/ …
├── backend-competition/         # nested today: assembly, change-encounter, encounter-games,
│   ├── assembly/                #   enrollment, transfer-loans → flattened or grouped glob
│   ├── enrollment/
│   └── …
└── backend-belgium/flanders/    # games, places, points
    └── …
config/                          # optional: shared tsconfig + eslint config packages
├── typescript-config/
└── eslint-config/

# Root
turbo.json                       # task pipeline (build/test/lint/dev/deploy)
pnpm-workspace.yaml              # globs: apps/*, packages/**, config/*
package.json                     # private root; scripts delegate to `turbo run`; devDeps: turbo, release-please
pnpm-lock.yaml                   # replaces package-lock.json
release-please-config.json + .release-please-manifest.json   # single repo-wide version

# DELETED
apps/badman/  apps/badman-e2e/  apps/badman-e2e-desktop/  apps/badman-e2e-mobile/
libs/frontend/*  (29 libs)
nx.json  every project.json  jest.preset.js(nx)  .nx/  package-lock.json
scripts/ci/legacy-projects.js  (no longer needed — FE deleted)
all @nx/* and nx devDependencies
```

**Structure Decision**: Turborepo `apps/` + `packages/` convention (FR-019). `apps/` holds the 5 deployables (paths unchanged). `libs/backend/*` + `libs/utils` move to `packages/` as compiled internal packages; nested groups (`competition/*`, `belgium/flanders/*`) are preserved via grouped workspace globs (`packages/**`) rather than flattening, to minimize churn and keep `git mv` history. Each package gets its own `package.json` (name = current `@badman/*` alias, `exports`, `build`/`test`/`lint` scripts), `tsconfig.json` (emits to `dist`), and per-package `jest.config.ts`. Shared `tsconfig`/`eslint` config become small `config/*` packages (optional, recommended by the Turborepo skill to avoid root-config cache busting).

## Complexity Tracking

| Violation                                                        | Why Needed                                                                                                                        | Simpler Alternative Rejected Because                                                                                                                   |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Stack swap: Nx → Turborepo (MAJOR constitution amendment)**    | The feature's entire purpose; maintainer wants a faster, simpler runner.                                                          | "Keep Nx" defeats the request. The amendment is unavoidable and intended — recorded here per the constitution's compliance-review clause.              |
| **Package-manager swap: npm → pnpm**                             | Skill-recommended pairing; faster installs, strict deps surface phantom-dependency bugs before they reach prod.                   | "Stay on npm" works but forgoes the main install-speed/correctness win; maintainer chose pnpm (clarify Q3).                                            |
| **Drop `tsconfig.paths` in favor of workspace deps + `exports`** | Turborepo internal-package pattern; `tsconfig.paths` is documented to break JIT/compiled resolution and bypasses the cache graph. | Keeping paths would fight the tool and lose per-package cache granularity. Import specifiers stay identical, so blast radius is config-only.           |
| **Single atomic cutover PR (vs incremental)**                    | Nx (`tsconfig.paths`) and Turborepo (`workspace:*`) resolution cannot both drive the graph at once without conflict.              | Incremental coexistence is fragile and higher total effort (clarify Q5). Risk mitigated by a long-lived branch kept rebased on `develop`.              |
| **External: Render.com build command change**                    | API + workers build on Render after a deploy-hook POST; build command must become pnpm + `turbo run build`.                       | No in-repo alternative — `render.js` only triggers the hook. Flagged as an out-of-band dependency; must be changed in the Render dashboard at cutover. |
