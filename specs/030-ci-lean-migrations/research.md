# Phase 0 Research: Lean CI with Automated Migrations

All `[NEEDS CLARIFICATION]` markers from the spec were resolved during `/speckit-clarify` (Session 2026-05-21). This document captures the remaining research items implied by the technical context and the rationale for each design decision.

## R1. How does the current `pull-request.yml` fail, and what is the minimum fix?

**Decision**: Remove the `Ovverride Base to be last release` step from `pull-request.yml` entirely. Rely on `nrwl/nx-set-shas@v4` to compute `NX_BASE`/`NX_HEAD` correctly for PRs (it uses the merge-base against the target branch for `pull_request` events).

**Rationale**: The step runs `git describe --first-parent --match 'v*' --abbrev=0 --tags` unconditionally on every PR. When the PR's history does not contain a reachable `v*` tag, `git describe` exits non-zero and fails the workflow before any real check runs. The comment `# run code only on main branch` was intent, not implementation — there is no `if:` gating that step. `nx-set-shas` already produces a sensible `NX_BASE` for PRs; the tag-based override is only meaningful on `main`, where `deploy-production.yml` (which has the same step) lives.

**Alternatives considered**:
- *Wrap the step in `if: github.ref == 'refs/heads/main'`*: Keeps dead code in a PR-only workflow. Rejected.
- *Replace `git describe` with `|| true` fallback*: Silently sets `NX_BASE=""`, which makes `nx affected` run against the wrong base. Rejected.

## R2. Reusable workflow file layout

**Decision**: GitHub Actions requires reusable workflows to be referenced as `./.github/workflows/<file>.yml`. Subdirectories under `workflows/` are not loaded as workflows by GitHub but ARE valid as locations for reusable-workflow targets when referenced by path. To avoid surprises, place reusable workflows directly under `.github/workflows/` with a `_shared-` prefix:

- `.github/workflows/_shared-setup.yml`
- `.github/workflows/_shared-migrate.yml`

GitHub will list them in the Actions UI, but the `on: workflow_call:` trigger means they are not invokable directly — only `uses:` references from sibling workflows can call them.

**Rationale**: Keeps the path predictable, avoids subdirectory edge cases, and follows the convention used in well-known monorepos (Vercel, Nx examples).

**Alternatives considered**:
- *Composite actions under `.github/actions/`*: Composite actions cannot define their own jobs or use `concurrency:` at the call site; the migration runner needs both. Rejected for the migrate step. Setup is borderline (composite would work), but using one mechanism for both is simpler.

## R3. Secrets scoping for fork PRs

**Decision**: All database-connection secrets — the seven `DB_*` vars (`DB_IP`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_DIALECT`, `DB_SSL`) that `database/config/config.js` already reads locally — live as **Environment** secrets attached to the `staging` and `production` GitHub Environments respectively, never as repository or organization secrets. Deploy hook secrets (`*_API_HOOK`, `*_WORKER_*_HOOK`) move to the corresponding Environment so they share the same scope.

**Rationale**: GitHub does not pass repository secrets to jobs triggered by `pull_request` events from forks. However, jobs that explicitly declare `environment: production` cannot be entered from a fork-triggered PR at all (the environment protection rule blocks it). Environment-scoped secrets are therefore unreachable from fork-supplied code. Repository-level secrets, by contrast, would be reachable if any internal workflow change accidentally passed them as inputs to a step that executes fork code. Environment isolation is the strongest available boundary.

**Operational note**: Setting up Environments and migrating secrets out of repository-level scope is a one-time admin task. It is documented in `quickstart.md` as a prerequisite step; this feature's workflow files assume it has been done.

**Alternatives considered**:
- *Leave secrets at repository level, rely on `pull_request_target` discipline*: Fragile; one mis-wired step leaks credentials. Rejected.

## R4. Concurrency / serialization model for migrations

**Decision**: Each migration job declares:

```yaml
concurrency:
  group: migrate-${{ inputs.target-environment }}
  cancel-in-progress: false
```

…where `inputs.target-environment` is `staging` or `production`. The PR-validation workflow keeps its existing `cancel-in-progress: true` (cancelling stale PR test runs is desirable). Only migration jobs are protected against cancellation.

**Rationale**: A `CREATE INDEX CONCURRENTLY` mid-flight cannot be cancelled cleanly; killing the workflow leaves Postgres holding an `INVALID` index that has to be cleaned up by hand. Serializing per-environment (one staging migration at a time, one prod migration at a time) is sufficient — staging and prod do not interfere with each other. A `concurrency` group at job level queues the second run; GitHub's UI shows it as "Waiting".

**Alternatives considered**:
- *DB advisory lock instead of GitHub concurrency*: Belt-and-braces, but adds complexity. Concurrency alone is sufficient given that the migration runner itself is a single short-lived job. Rejected for v1; can be added later if multi-runner contention appears.
- *Cancel-in-progress with idempotent retry*: Idempotency does not help if the cancellation happens mid-DDL. Rejected.

## R5. Invalid-state detection for non-transactional migrations

**Decision**: Add a pre-flight script `scripts/migrations/check-invalid-indexes.js` (Node, uses the same Sequelize config as the migration runner) that, before running migrations, queries:

```sql
SELECT schemaname, indexrelname
FROM pg_stat_user_indexes
WHERE indrelid IN (
  SELECT indrelid FROM pg_index WHERE indisvalid = false
);
```

If any row is returned, the script exits non-zero with a message naming each `schema.index` and instructing the operator to `DROP INDEX CONCURRENTLY ...` before re-running. The migration step is gated on this script's success.

**Rationale**: This is the exact failure mode called out in FR-011 and SC-008. Sequelize itself does not detect invalid indexes; surfacing them in pre-flight with remediation is cheap and matches the "fail fast with clear error" pattern in the spec.

**Alternatives considered**:
- *Detect inside the migration runner*: Would require patching `sequelize-cli` or wrapping it. Simpler to fail the step before it starts. Rejected.
- *Auto-drop invalid indexes*: Hides bugs that may indicate a partially applied migration with other side effects. Rejected — operator must see and decide.

## R6. Migration logging granularity (FR-010, SC-007)

**Decision**: Invoke the runner as:

```bash
npx sequelize-cli db:migrate --debug 2>&1 | tee migrate.log
```

then echo the list of files Sequelize reports it applied (the `== <filename>: migrating =======` and `== <filename>: migrated ...` lines) into a workflow step summary. On failure, surface the failing filename and the last 50 lines of `migrate.log` via `$GITHUB_STEP_SUMMARY`.

**Rationale**: Sequelize CLI already prints the filename for each migration as it runs. Capturing stdout and re-publishing the relevant lines satisfies FR-010 and the SC-007 verification path without adding tooling.

**Alternatives considered**:
- *Query `SequelizeMeta` before and after the run*: Equivalent information but two extra DB round-trips. Rejected.

## R7. PR-validation job composition

**Decision**: After the broken tag-override step is removed, `pull-request.yml` runs (via the `_shared-setup.yml` reusable workflow + inline steps):

1. Checkout (full history) — from `_shared-setup.yml`
2. `nx-set-shas` — from `_shared-setup.yml`
3. `nx-cloud start-ci-run` — from `_shared-setup.yml`
4. `npm ci` — from `_shared-setup.yml`
5. `npx nx affected -t lint typecheck test build -c ci` — inline in `pull-request.yml`
6. `nx-cloud complete-ci-run` (always) — from `_shared-setup.yml` (post step)

E2E, coverage merge, SonarCloud, and Playwright artifact upload are all removed from `pull-request.yml`. SonarCloud and the Playwright E2E suite are deleted from `deploy-production.yml` as well. Coverage merge remains on `deploy-production.yml` only.

**Rationale**: Matches Q3 ("Remove SonarCloud entirely; keep E2E + coverage on `main` only") plus the user's follow-up note that the Playwright E2E suite is unmaintained and provides no signal — keeping it on `main` would burn runner time and create noisy red builds without catching real regressions. Removing it entirely is the simpler call. `typecheck` is added explicitly because the spec calls it out as a P1 check (FR-002) and the current workflow leans on it being part of `build` — making it explicit is clearer and gives a faster targeted feedback signal.

**Alternatives considered**:
- *Keep E2E on `main` only as a tripwire*: User explicitly stated the suite is out of date. A perpetually-red tripwire teaches operators to ignore it. Rejected.
- *Run `npx tsc --noEmit` directly*: Bypasses Nx caching. Rejected.
- *Keep coverage on PR but only upload, no gate*: Adds runtime for no consumer. Rejected.

**Follow-up implementation note**: When removing E2E from the workflow files, delete only the workflow steps (Playwright install/run/merge/upload). The `apps/*/playwright.config.ts` files and the `e2e-ci` Nx targets themselves are out of scope here — leaving them in the tree is fine and lets a future revival happen without a spec change. If the team also wants those deleted, raise as a follow-up.

## R8. Trigger event for the new `deploy-staging.yml` workflow

**Decision**:

```yaml
on:
  push:
    branches: [staging]
  workflow_dispatch:
```

The `workflow_dispatch` form lets an operator re-run a migration manually if the original push hit a transient infra failure (e.g., database briefly unreachable per the edge case in the spec).

**Rationale**: Matches Q1 (push/merge to `staging` branch). `workflow_dispatch` keeps the operator-runbook story (quickstart.md) simple.

**Alternatives considered**:
- *`pull_request` against `staging`*: PRs to `staging` should be validated by `pull-request.yml`, not run migrations against the staging DB. Rejected.

## R9. Trigger event for the prod migration step in `deploy-production.yml`

**Decision**: Keep the existing `on: push: branches: [main]` trigger. Add a new job `migrate-prod` that depends on the existing `main` job and runs inside `environment: production`. The `production` environment has a required-reviewer protection rule (configured in repo settings, not in the workflow file).

The `Deploy to Prod` step in the existing `main` job is moved into a third job, `deploy-prod`, which depends on `migrate-prod`. `Deploy to Beta` is removed from `deploy-production.yml` entirely; staging deploys now live in `deploy-staging.yml`.

**Rationale**: Matches Q5 (push to `main` → approval gate → migration + prod deploy). Splitting into three jobs (`main`, `migrate-prod`, `deploy-prod`) keeps the approval gate cleanly between "build artifact" and "apply schema change", and makes a failed migration block the deploy automatically via `needs:`.

**Alternatives considered**:
- *Single job with `environment:` declared at job level and inline deploy step*: Mixes build-time and deploy-time concerns in one job; harder to retry just the deploy after a successful migration. Rejected.

## R10. What happens to the existing `Beta` deploy on push to `main`?

**Decision**: Remove the `Deploy to Beta` step from `deploy-production.yml`. Beta (=staging) deploy now happens exclusively from `deploy-staging.yml` when `staging` is updated. Promotion to prod is its own act.

**Rationale**: Today, every push to `main` also redeploys Beta — which means staging tracks `main`, not `develop`/`staging`. After this change, `staging` tracks the `staging` branch (which is the agreed pre-prod surface per Q1) and `main` triggers prod-only. This is the change implied by introducing a real `staging` branch trigger; it removes the duplication.

**Alternatives considered**:
- *Keep dual deploy on `main`*: Confuses what "staging" means and undermines the value of a dedicated `staging` branch. Rejected.

## R11. Existing `Merge development -> main` and `Merge main -> develop` automation

**Decision**: Preserve both auto-merge steps in `deploy-production.yml` for now. They are orthogonal to the migration changes. Document them in `quickstart.md` so the operator understands the promotion flow end-to-end.

**Rationale**: Out of scope. Their behavior on prod migration is "they don't interact" — they run before/after the deploy and don't touch the database directly.

**Alternatives considered**:
- *Remove the auto-merges as part of leanness*: Out of scope and risky; would change the team's release ritual. Rejected.

## R12. Node version for the runners

**Decision**: Use `actions/setup-node@v4` with `node-version-file: .nvmrc` in `_shared-setup.yml`. (Today the workflows rely on the runner's default Node which is fragile against runner image updates.)

**Rationale**: Pinning Node to whatever the repo declares in `.nvmrc` (or `package.json` `engines`) makes the workflow reproducible. If neither file exists, this is the moment to add an `.nvmrc` — but verifying the repo's current Node target is part of implementation, not planning.

**Alternatives considered**:
- *Hard-code `node-version: 20` in the workflow*: Drifts from local-dev pinning. Rejected.

---

## Open items deferred to implementation (not blocking the plan)

- Exact Node version pin (resolve from `.nvmrc` / `package.json` `engines` during implementation).
- Whether the existing `Sentry release` job in `deploy-production.yml` needs to gate on `deploy-prod` success rather than the old `main` job; trivial wiring, no design impact.
- Whether `merge_group:` should continue to trigger the lean PR workflow (likely yes — kept).

These do not introduce `NEEDS CLARIFICATION` markers; they are minor implementation details with obvious resolutions.
