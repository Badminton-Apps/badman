# Implementation Plan: Lean CI with Automated Migrations

**Branch**: `030-ci-lean-migrations` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/030-ci-lean-migrations/spec.md`

## Summary

Replace the currently-failing PR-validation workflow with a lean, reliable workflow (typecheck, lint, affected unit tests, build) that does not depend on a reachable `v*` tag. Introduce automated Sequelize migrations:

- **Staging**: push to `staging` branch → run `npx sequelize-cli db:migrate` against the staging database inside a `staging` GitHub Environment, then deploy via existing Beta hooks.
- **Production**: push to `main` → enter `production` GitHub Environment with a required-reviewer protection rule → on approval, run migration + Prod deploy via existing hooks.

Slow checks are demoted: SonarCloud is removed, full E2E + coverage merge run only on `main` (post-release). Duplicated setup (checkout, base-SHA resolution, Nx Cloud bracket, dependency install) is extracted into a single reusable workflow consumed by every workflow that needs it. Migration jobs are serialized per target environment via a `concurrency` group with no `cancel-in-progress`, so a mid-flight migration cannot be killed.

## Technical Context

**Language/Version**: GitHub Actions YAML (workflow schema 2024+) + Bash for inline steps; Node.js 20 runner (per `package.json` engines).
**Primary Dependencies**:
- `actions/checkout@v4`, `nrwl/nx-set-shas@v4` (existing)
- `npx --yes nx-cloud start-ci-run` / `complete-ci-run` (existing)
- `npx sequelize-cli db:migrate` (canonical migration runner per `CLAUDE.md`)
- GitHub Environments (`staging`, `production`) for secret scoping + manual approval

**Storage**:
- Staging PostgreSQL (split env-secrets `DB_IP`/`DB_PORT`/`DB_DATABASE`/`DB_USER`/`DB_PASSWORD`/`DB_DIALECT`/`DB_SSL` in the `staging` GitHub Environment, matching the existing `database/config/config.js` env-var shape)
- Production PostgreSQL (same seven split env-secrets in the `production` GitHub Environment)
- Sequelize `SequelizeMeta` table is the migration history of record.

**Testing**:
- Acceptance verified by deliberate fixture commits exercising each US scenario (a failing test PR, a failing migration, an interrupted non-transactional migration) and by examining the resulting workflow run + `SequelizeMeta` rows. No new test framework is introduced.
- The shared reusable workflow is exercised by both `pull-request.yml` and `deploy-production.yml` consumers; a smoke push to a throwaway branch validates the wiring end-to-end.

**Target Platform**: GitHub-hosted `ubuntu-latest` runners with outbound TCP to the database hosts. (Assumption from spec — if egress is blocked at the DB end, a self-hosted runner is a follow-up out of scope.)

**Project Type**: CI/CD infrastructure for an Nx monorepo. No application code changes. No new persistent entities. Files live under `.github/workflows/` and (new) `.github/workflows/_shared/`.

**Performance Goals**:
- Median PR-validation wall-clock ≤ 8 min; p95 ≤ 15 min (SC-002).
- Staging migration recorded in `SequelizeMeta` ≤ 30 min after push to `staging` (SC-004).

**Constraints**:
- PR-validation MUST NOT contact any non-local database (FR-004).
- Fork PRs MUST NOT see deploy or DB secrets (FR-005, FR-013) — enforced by GitHub Environment scoping (Environment secrets are not exposed to jobs in PRs from forks; only the env-scoped jobs running in trusted contexts can read them).
- Migration jobs MUST serialize on `concurrency: migrate-${{ env-name }}`, `cancel-in-progress: false` (FR-012).
- Production migration MUST wait at a manual-approval environment gate (FR-014).
- Existing deploy hooks (`PROD_*_HOOK`, `STAGING_*_HOOK`) remain the deploy mechanism (FR-018).

**Scale/Scope**:
- 6 workflow files today in `.github/workflows/`; ~3 require structural change (`pull-request.yml`, `deploy-production.yml`, new `deploy-staging.yml` or fold into `deploy-production.yml`).
- ~250 migration files under `database/migrations/` (existing); no migration content is modified by this feature.
- A handful (~10–20) of PRs/day across `develop`/`main`/`staging`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Mapping against the five core principles (see `.specify/memory/constitution.md`):

| Principle | Touched? | Compliance |
|---|---|---|
| I — Code-First GraphQL via Sequelize Models | No | N/A. Feature is CI/CD only; no new entities. |
| II — Translation Discipline | No | N/A. No i18n changes. |
| III — Transactional Mutations | No | N/A. No new GraphQL mutations. Existing migration framework (`up`/`down` transactional except documented non-transactional cases) is preserved unchanged. |
| IV — Resolver Test Discipline | No | N/A. No resolvers added or modified. |
| V — Legacy Frontend Boundary | No | N/A. No work in `apps/badman/` or `libs/frontend/`. |

**Tech-stack constraints** (Technology Stack & Constraints section of the constitution):
- `npx sequelize-cli db:migrate` remains the migration runner ✅
- `database/migrations/` JS files with transactional `up`/`down` unchanged ✅
- Nx Cloud distributed execution preserved ✅
- Prettier check still required pre-merge (workflow continues to run lint + format gates) ✅

**Result**: Constitution Check **PASSES**. No violations, no Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/030-ci-lean-migrations/
├── plan.md              # This file (/speckit.plan output)
├── spec.md              # Feature spec (already exists)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (workflow-run entities only — no DB schema)
├── quickstart.md        # Phase 1 output (operator runbook)
├── contracts/           # Phase 1 output (workflow trigger + env contracts)
│   ├── workflow-triggers.md
│   └── migration-runner.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

This feature touches infrastructure-as-code only. No `apps/` or `libs/` changes.

```text
.github/
└── workflows/
    ├── pull-request.yml          # Lean PR-validation: typecheck, lint, affected test+build (renamed from ci-v2.yml)
    ├── deploy-staging.yml        # NEW — push to staging → migrate staging → Beta deploy
    ├── deploy-production.yml     # Prod release path: push to main → approval → migrate prod → deploy + Sentry (renamed from main-v2.yml)
    ├── _shared-setup.yml         # NEW — reusable workflow: checkout, base-SHA, Nx Cloud, install
    └── _shared-migrate.yml       # NEW — reusable workflow: run sequelize-cli db:migrate against env-scoped DB_* secrets with concurrency + invalid-state detection

database/
└── migrations/                  # UNCHANGED (existing 250+ JS files)
```

**Structure Decision**: Existing `ci-v2.yml` is renamed to `pull-request.yml` (describes the trigger) and `main-v2.yml` is renamed to `deploy-production.yml` (describes the action + target). The `v2` suffix is dropped because there is no `v1` to disambiguate. A new `deploy-staging.yml` mirrors the prod workflow for the `staging` branch trigger. Two reusable workflows (`_shared-setup.yml`, `_shared-migrate.yml`) live directly under `.github/workflows/` with a `_shared-` filename prefix (GitHub does not load subdirectories as workflow files; the prefix is a naming convention only). All three top-level workflows call the reusable ones via `uses: ./.github/workflows/_shared-setup.yml`. The `staging` and `production` GitHub Environments are configured in repository settings (out-of-band, documented in `quickstart.md`); environment secrets are populated separately by the repository admin.

## Complexity Tracking

No constitution violations. Section intentionally left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | — | — |
