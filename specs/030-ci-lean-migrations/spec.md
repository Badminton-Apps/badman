# Feature Specification: Lean CI with Automated Migrations

**Feature Branch**: `030-ci-lean-migrations`
**Created**: 2026-05-21
**Status**: Draft
**Input**: User description: "Right now, the pipeline (workflow on github, ci-v2.yml) always fails. Could we reuse that to run migrations? Check it, and see what makes sense to keep and what can be removed (or is duplicated somewhere else). Need to keep it lean. typecheck, linting, tests, and whatever else is fast / necessary and makes sense."

## Clarifications

### Session 2026-05-21

- Q: Which trigger applies migrations to staging? → A: Push/merge to the `staging` branch.
- Q: How is the production migration step gated? → A: GitHub Environment `production` requires manual reviewer approval before the migration job runs.
- Q: Disposition of slow checks (E2E, coverage merge, SonarCloud)? → A: Remove SonarCloud entirely; keep E2E + coverage on `main` only (not on PR).
- Followup (2026-05-21): E2E tests are out of date and not maintained. Remove the Playwright `e2e-ci` step and related artifact upload from BOTH `pull-request.yml` and `deploy-production.yml`. Coverage merge still runs on `main` only.
- Q: Concurrent migration runs against the same target environment? → A: Serialize via concurrency group; second run queues, no cancellation of in-flight migration.
- Q: Production migration trigger (FR-007)? → A: Push to `main` enters the `production` environment job, waits at the manual approval gate, then runs migration + prod deploy.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - PR validation passes reliably (Priority: P1)

A developer opens or updates a pull request. A single CI workflow runs against the changes and reports a clear green or red status within a predictable time budget. The workflow does not fail on environmental concerns unrelated to the code change (such as missing release tags or scaffolding errors). When it fails, the failure points to a real issue in the developer's commit.

**Why this priority**: PR validation is the safety gate every merge depends on. The current workflow has been failing on every PR because of a tag-lookup step that errors on commits not reachable from any release tag. Until this is fixed, the team has no automated confidence that a PR is safe to merge, and reviewers fall back to manual checks.

**Independent Test**: Open a trivial pull request (e.g., a typo fix). Observe that the PR-validation workflow runs to completion and reports a green status. Open a PR with a deliberately broken test or lint violation; observe a red status with a clear, code-level error.

**Acceptance Scenarios**:

1. **Given** a fresh PR targeting `develop`, **When** the workflow runs, **Then** it completes within the agreed time budget and reports green.
2. **Given** a PR that introduces a failing unit test, **When** the workflow runs, **Then** it reports red with the failing test name in the logs.
3. **Given** a PR that introduces a lint or type error, **When** the workflow runs, **Then** it reports red with the offending file and rule.
4. **Given** a PR opened against a branch that has no release tag reachable in its history, **When** the workflow runs, **Then** it does NOT fail on tag lookup or any other release-related step.

---

### User Story 2 - Database migrations apply automatically to staging on every accepted change (Priority: P2)

When a change that includes a new database migration reaches the agreed promotion point, the migration runs against the staging database automatically, before (or as part of) the staging deploy. The team does not need to remember to run migrations manually from a laptop. Re-runs are safe: only migrations that have not yet been applied are executed.

**Why this priority**: Staging exists to catch problems before prod. If migrations are applied manually from a laptop, they get skipped, forgotten, or run out-of-order, which breaks staging and erodes trust in it as a release gate. Automating this is the single biggest unlock for safer releases.

**Independent Test**: Merge a PR that contains a new migration into the configured promotion target. Observe that the migration is recorded in the staging database's `SequelizeMeta` table within a defined SLA after the merge, and that the staging API continues to respond healthy. Re-running the workflow leaves the database state unchanged.

**Acceptance Scenarios**:

1. **Given** a merged PR containing a new migration, **When** the staging promotion runs, **Then** the migration is applied to the staging database exactly once and recorded in the migration history table.
2. **Given** a promotion run with no new migrations, **When** the migration step executes, **Then** it completes successfully without changing the database state.
3. **Given** a migration that fails partway through, **When** the migration step errors, **Then** the staging deploy does not proceed, the failure is reported with the migration filename, and the workflow exits non-zero.
4. **Given** the same workflow runs twice in succession, **When** the second run executes, **Then** no migration is reapplied.

---

### User Story 3 - Production migrations are explicit and gated (Priority: P2)

A migration only reaches the production database under conditions that have been deliberately and visibly authorized. There is a documented promotion trigger; pull-request commits never cause prod schema changes. A failed prod migration halts the prod deploy and surfaces clearly in the workflow's status.

**Why this priority**: Schema changes in prod are the highest-risk action this pipeline can take. If they happen accidentally from a PR or develop merge, the blast radius is the whole platform. The team needs an explicit boundary between "validated change" and "applied to prod".

**Independent Test**: Push a commit containing a migration to the configured pre-prod target. Observe that the migration is NOT applied to the production database. Then perform the documented prod promotion action; observe that the migration is applied to production and that the trigger is recorded in the workflow run history.

**Acceptance Scenarios**:

1. **Given** a PR that adds a migration, **When** CI runs on the PR, **Then** the production database is not contacted in any way.
2. **Given** a merge to the pre-prod branch (e.g., `develop`), **When** the workflow runs, **Then** the staging database receives the migration but production does not.
3. **Given** the agreed prod promotion trigger fires, **When** the migration step runs, **Then** production migrations are applied and the workflow records which migration files were executed.
4. **Given** a prod migration step fails, **When** the failure occurs, **Then** the prod deploy step does not run and the workflow exits non-zero with the migration filename surfaced in logs.

---

### User Story 4 - CI is lean and free of duplication (Priority: P3)

The PR-validation workflow does only the work that is fast and necessary to be confident in the change: typecheck, lint, unit tests, build. Slow optional checks (full E2E suites, coverage merges that aren't consumed by a gate) are either gated behind an explicit opt-in or moved to a workflow that runs less often. Steps that are duplicated across workflows are extracted so that there is a single place to change them.

**Why this priority**: A lean workflow gives developers faster, more reliable feedback, and reduces the number of places where the same scaffolding mistake (like the broken tag-lookup step) has to be fixed. This is a quality-of-life improvement that compounds with US1.

**Independent Test**: Measure the median wall-clock time for the PR-validation workflow before and after the change on a sample of representative PRs. Confirm the median falls by a meaningful percentage (target defined in Success Criteria). Inspect the workflow files: confirm that no setup or release step is repeated verbatim in more than one workflow.

**Acceptance Scenarios**:

1. **Given** a small PR that touches a single library, **When** the workflow runs, **Then** it finishes within the agreed P1 time budget.
2. **Given** the workflow file set, **When** a reviewer inspects them, **Then** common setup logic (checkout, dependency install, base-SHA resolution, nx-cloud start/stop) exists in exactly one place.
3. **Given** the E2E suite has been removed from the workflows, **When** any workflow runs, **Then** no Playwright `e2e-ci` step executes and no `playwright-report` artifact is produced.

---

### Edge Cases

- **No release tag reachable**: A PR may be opened from a branch whose history does not yet contain any release tag (e.g., a long-running feature branch). The workflow must not depend on a reachable `v*` tag to compute its `nx affected` base.
- **Migration file partially applied**: A `CREATE INDEX CONCURRENTLY` (or any non-transactional migration) is interrupted mid-flight. The migration step must detect that a previous run left an inconsistent state and report it rather than silently continuing.
- **Empty migration set**: A promotion runs and there are no new migrations to apply. The workflow must succeed without error.
- **Migration order conflict**: Two PRs each add a migration with overlapping timestamps and are merged in a different order than the timestamps imply. The workflow must apply migrations in the order Sequelize's migration framework determines, and surface any version-table inconsistency it detects.
- **Database unreachable from CI**: The staging or prod database refuses connections (network, credentials, maintenance). The workflow must fail fast with a clear error and not retry indefinitely.
- **Secret rotation mid-deploy**: The DB connection string changes during a deploy. The workflow must use the current secret at the moment the migration step runs, not a cached value.
- **Concurrent promotions**: Two promotion workflows run at the same time against the same database. The workflow must prevent concurrent migration steps for the same target environment.
- **Pull request from a fork**: A PR opened from a forked repo. The PR-validation workflow must run safely without exposing repository secrets to fork-supplied code.

## Requirements *(mandatory)*

### Functional Requirements

#### CI / PR validation

- **FR-001**: The PR-validation workflow MUST complete successfully on a PR whose history does not contain a reachable release tag, without relying on `git describe` against `v*` tags as a hard prerequisite.
- **FR-002**: The PR-validation workflow MUST run, at minimum: TypeScript typecheck, lint, and the unit test suite for affected projects on every pull request to `develop` or `main`.
- **FR-003**: The PR-validation workflow MUST report a single, top-level pass/fail status that protected branches can require.
- **FR-004**: The PR-validation workflow MUST NOT contact any non-local database (staging, production, or otherwise).
- **FR-005**: The PR-validation workflow MUST run safely for pull requests opened from forks, without exposing deploy secrets, production credentials, or database credentials to fork-supplied code.

#### Migrations

- **FR-006**: The pipeline MUST apply any pending database migrations to the staging database before (or as part of) a staging deploy, automatically, on every push (or merge) to the `staging` branch.
- **FR-007**: The pipeline MUST apply any pending database migrations to the production database before (or as part of) a production deploy. The trigger is a push to `main`; the migration job runs inside the `production` GitHub Environment and waits for the manual approval gate defined in FR-014 before executing.
- **FR-008**: The migration step MUST be idempotent: running it when no migrations are pending leaves the database state unchanged and exits successfully.
- **FR-009**: The migration step MUST fail the workflow (non-zero exit) when any migration fails, and the deploy step that depends on it MUST NOT run.
- **FR-010**: The migration step MUST log, for each run, the list of migration filenames it applied (or "none" when empty), so this information is reviewable from the workflow run history.
- **FR-011**: The migration step MUST detect when a prior run left a migration in an invalid state (e.g., an interrupted `CREATE INDEX CONCURRENTLY` leaves an `INVALID` index) and surface this as a failure with remediation guidance, rather than silently re-attempting.
- **FR-012**: Only one migration step against a given target environment (staging or production) MUST run at a time. Concurrent workflow runs targeting the same environment MUST be serialized via a GitHub Actions concurrency group keyed on the target environment; the second run MUST wait for the first to complete (no `cancel-in-progress` for migration jobs).
- **FR-013**: Database connection secrets used by the migration step MUST come from GitHub Environment secrets scoped to the target environment, never from repository-level or workflow-level variables that are visible to PRs from forks.
- **FR-014**: The migration step targeting production MUST run inside a GitHub Environment named `production` whose protection rules require manual approval from a designated reviewer before the job executes. The approver and approval timestamp MUST be visible in the workflow run history.

#### Workflow hygiene

- **FR-015**: Setup logic that is currently duplicated across `pull-request.yml` and `deploy-production.yml` (checkout with full history, base-SHA resolution, Nx Cloud start/stop, dependency install) MUST exist in a single shared location (reusable workflow or composite action) referenced by both.
- **FR-016**: The SonarCloud scan MUST be removed from all workflows. The Playwright E2E suite (`e2e-ci` target and its artifact upload) MUST be removed from all workflows because the suite is unmaintained. The coverage report merge MUST run only on push to `main` (post-release), not on pull requests, so it does not lengthen the typical PR feedback loop.
- **FR-017**: Each workflow file MUST contain only steps required for its stated purpose (PR validation vs. release). Steps that no downstream step depends on MUST be removed.
- **FR-018**: The pipeline MUST continue to support the existing deploy mechanism for the API and worker apps (current Beta and Prod deploys via deploy hooks) without functional regression.

### Key Entities *(include if feature involves data)*

- **CI Workflow Run**: A single execution of the PR-validation workflow, attached to a PR. Carries a status (pending / success / failure / cancelled), a duration, and a log of steps executed. The unit that branch protection observes.
- **Promotion Run**: A single execution of the deploy / migration workflow targeting one environment (staging or production). Carries which migrations it applied, which deploy hooks it called, and the trigger that fired it.
- **Migration Record**: A row in the database's migration-history table identifying a migration file that has been applied to a given database. Used to make migration application idempotent.
- **Target Environment**: A named deploy destination (staging / production) with its own database connection secret and its own protection rules.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pull requests opened against `develop` or `main` over a 14-day window receive a non-cancelled, code-attributable pass/fail status from the PR-validation workflow. (Baseline today is approximately 0% because of the tag-lookup error.)
- **SC-002**: Median wall-clock time for the PR-validation workflow on a representative PR (small change to a single library) is at or below 8 minutes; 95th-percentile at or below 15 minutes.
- **SC-003**: 0 manual `sequelize-cli db:migrate` invocations from a developer laptop against staging or production over a 30-day window after rollout.
- **SC-004**: 100% of merged changes that introduce a database migration result in that migration being recorded in the staging migration-history table within 30 minutes of the merge, with no manual intervention.
- **SC-005**: 0 production migrations are applied by a workflow triggered by a PR commit over any 30-day window.
- **SC-006**: At least one piece of setup logic (base-SHA resolution, dependency install, or Nx Cloud orchestration) is referenced from a single shared location by both `pull-request.yml` and `deploy-production.yml`; in concrete terms, the LOC count of duplicated YAML across these two files drops by at least 40% relative to the current baseline.
- **SC-007**: When a migration fails, the workflow's overall run is marked failed, the failing migration filename appears in the run's logs, and the deploy step does not execute. Verified by a deliberate test using a migration that throws.
- **SC-008**: An interrupted non-transactional migration (e.g. `CREATE INDEX CONCURRENTLY` leaving an INVALID index) causes the next migration run to fail with a clear remediation message that names the invalid object, rather than silently retrying or hanging.

## Assumptions

- The API and workers continue to be deployed to a container PaaS via the existing deploy hooks (`PROD_API_HOOK`, `STAGING_API_HOOK`, `*_WORKER_*_HOOK`) configured in `deploy-production.yml`. This feature does not change the deploy mechanism itself; it adds a migration step in front of it and removes the broken validation workflow's failures.
- Database connection strings for staging and production are (or will be) stored as GitHub Environment secrets, accessible only to jobs that target the matching environment. Repository-level secrets remain off-limits to the migration step.
- The Sequelize CLI (`npx sequelize-cli db:migrate`) is the canonical migration runner, as documented in `CLAUDE.md` and `README.md`. This feature does not introduce a new migration framework.
- The `develop` branch is the integration target for ongoing work; `staging` is the pre-prod branch that triggers staging migrations + Beta deploy; `main` is the release branch from which Prod deploys originate. Migrations against staging happen on push to `staging` (FR-006).
- The non-transactional migration pattern recently introduced (`useTransaction: false` + `CREATE INDEX CONCURRENTLY`) is a supported case, not an exception. The pipeline must handle it without rolling it back into a transaction.
- Nx Cloud distributed execution remains available and is not removed by this feature.
- The platform supports outbound database connections from GitHub-hosted runners (network reachable, TLS-terminated). If this is not the case, a follow-up is required to introduce a self-hosted runner or a one-off migration container; that follow-up is out of scope here.
