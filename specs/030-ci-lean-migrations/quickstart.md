# Quickstart: Lean CI with Automated Migrations

Operator runbook for landing this feature. Steps are ordered for safe rollout. Each step is reversible until step 5.

## Prerequisites (one-time, admin-only)

These are done in the GitHub repository settings UI, NOT in code:

1. **Create the `staging` GitHub Environment.**
   - Settings → Environments → New environment → name: `staging`.
   - Add environment secrets:
     - `DB_IP`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_DIALECT` (=`postgres`), `DB_SSL` (=`true`) — pointing at the staging DB. Same shape as `database/config/config.js` reads locally; no app code change.
     - `STAGING_API_HOOK`, `STAGING_WORKER_SYNC_HOOK`, `STAGING_WORKER_RANKING_HOOK` — copy from existing repository secrets, then DELETE the repository-level copies.
   - No protection rules required.

2. **Create the `production` GitHub Environment.**
   - Settings → Environments → New environment → name: `production`.
   - Add environment secrets:
     - `DB_IP`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_DIALECT` (=`postgres`), `DB_SSL` (=`true`) — pointing at the prod DB.
     - `PROD_API_HOOK`, `PROD_WORKER_SYNC_HOOK`, `PROD_WORKER_RANKING_HOOK` — copy from repository secrets, then DELETE the repository-level copies.
   - Add protection rules:
     - **Required reviewers**: at least one maintainer (recommend two named individuals; do not use teams alone, so the audit log captures a person).
     - **Prevent self-review**: enabled.
     - **Wait timer**: 0 (no benefit here; the human gate is the gate).

3. **Create the `staging` branch.**
   ```bash
   git checkout develop
   git pull
   git checkout -b staging
   git push -u origin staging
   ```
   Add `staging` to branch protection: require PRs from `develop`, require `validate` job from `pull-request.yml` to pass.

4. **Verify outbound DB connectivity from GitHub-hosted runners.**
   - From a throwaway branch, run a one-off `psql -c 'SELECT 1'` job against the staging DSN.
   - If the DB rejects connections from GitHub IP ranges, escalate — this feature assumes egress works. A self-hosted runner is the fallback (out of scope).

## Implementation steps

### Step 1 — Add the reusable workflows

Create:

- `.github/workflows/_shared-setup.yml` — checkout, `nx-set-shas`, `nx-cloud start-ci-run`, `setup-node@v4`, `npm ci`. Exposes outputs via `workflow_call`.
- `.github/workflows/_shared-migrate.yml` — implements the contract in [`contracts/migration-runner.md`](contracts/migration-runner.md).
- `scripts/migrations/check-invalid-indexes.js` — Node script that reads the seven `DB_*` env vars and `SELECT … FROM pg_index WHERE indisvalid = false`. Exits non-zero with named indexes on hit.

Reversible: just delete the files if anything goes sideways.

### Step 2 — Fix `pull-request.yml`

In one commit:

- Delete the `Ovverride Base to be last release` step (the broken tag lookup).
- Replace the inline setup steps with `uses: ./.github/workflows/_shared-setup.yml`.
- Replace the inline `nx affected` line with `npx nx affected -t lint typecheck test build -c ci`.
- Delete the Playwright E2E step, the `e2e reports` step, and the `playwright-report` artifact upload.
- Delete the coverage merge step and the `coverage-report` artifact upload.
- Delete the SonarCloud scan step.

Open a draft PR. Watch it pass. This step alone resolves US1 (SC-001).

### Step 3 — Add `deploy-staging.yml`

Create `.github/workflows/deploy-staging.yml` per [`contracts/workflow-triggers.md`](contracts/workflow-triggers.md). Three jobs: `build`, `migrate-staging` (calls `_shared-migrate.yml`), `deploy-staging`.

Verify by:
- Push a no-op commit to `staging`. Expect green run with "No pending migrations." in the migrate step summary.
- Then push a fresh migration. Expect green run with the migration filename in the summary and a new row in staging's `SequelizeMeta`.

### Step 4 — Refactor `deploy-production.yml`

In one commit:

- Replace inline setup steps with `uses: ./.github/workflows/_shared-setup.yml` where applicable. (Note: the `Setup package manager` step is kept for the existing PNPM/Yarn switch, even though current value is `npm`.)
- Delete the Playwright E2E step, `e2e-tests` workflow input, and the `playwright-report` artifact upload.
- Delete the SonarCloud scan step.
- Delete the `Deploy to Beta` step (staging deploys now live in `deploy-staging.yml`).
- Split the existing `Deploy to Prod` step into a new `deploy-prod` job that depends on a new `migrate-prod` job (which calls `_shared-migrate.yml`).
- Add `environment: production` to both `migrate-prod` and `deploy-prod`.
- Update `sentry-release.needs` from `main` to `deploy-prod`.

Verify by:
- Push a no-op commit to `main`. Expect: build green, then **the workflow halts at the approval gate** for `migrate-prod`. Approve. Expect: migrate green ("No pending migrations."), deploy green, Sentry release green.
- Push a fresh migration to `main` (via the normal develop→main route). Expect: approval gate; on approval, migration filename appears in step summary and in prod's `SequelizeMeta`.

### Step 5 — Decommission old repository-level deploy secrets

Once two consecutive successful prod deploys via the new flow have completed, delete `PROD_*_HOOK` and `STAGING_*_HOOK` at the repository level. Environment-scoped copies remain. **Not reversible** — keep the old values written down in a password manager until the change has soaked.

## Failure recovery

| Symptom | Recovery |
|---|---|
| `migrate-staging` fails with named migration file | Fix the migration in a follow-up PR, merge to `develop` → `staging`, re-run. |
| `migrate-prod` fails after approval | Fix the migration in a follow-up PR, merge to `main`, re-approve when the new workflow run reaches the gate. The failed run's approval does NOT carry over. |
| Pre-flight reports an `INVALID` index | Follow the message: `DROP INDEX CONCURRENTLY schema."index_name"` on the affected DB, investigate why the prior run was killed, then re-run. |
| Concurrency queue piles up (staging) | Expected when multiple pushes land back-to-back. They run in order. Cancel only via the GitHub UI if you intentionally want to drop one. |
| Approval gate never appears for prod | Check `production` environment has at least one reviewer set, and that the reviewer is not the PR author (self-review is blocked by design). |
| Fork PR fails on a missing secret | Expected and correct. Fork PRs cannot read environment secrets. Have a maintainer push the change to a branch on the upstream repo. |

## Verification matrix

Tie back to spec Success Criteria:

| SC | How to verify |
|---|---|
| SC-001 (100% PRs get pass/fail) | Wait 14 days post-step-2. Pull GitHub Actions API → count cancelled-or-failed-on-setup vs total. Target: 0 setup failures. |
| SC-002 (≤8 min median, ≤15 min p95) | Same dataset. Compute percentiles on the `validate` job duration. |
| SC-003 (0 manual migrate from laptop) | Ask the team. (Cultural.) Trust + audit DB connection logs if needed. |
| SC-004 (migration in SequelizeMeta ≤30 min) | Pick a recent merge into `staging` with a migration; compare merge timestamp to row creation timestamp in `SequelizeMeta`. |
| SC-005 (0 prod migrations from PR commits) | Audit `production` environment deployment history. All entries must originate from `push: main` or `workflow_dispatch`. |
| SC-006 (≥40% duplicated YAML LOC reduction) | `cloc` or `wc -l` on the duplicated blocks before/after. |
| SC-007 (failed migration blocks deploy) | Test fixture T4 from [`contracts/migration-runner.md`](contracts/migration-runner.md). |
| SC-008 (INVALID index detected) | Test fixture T5. |

## Out of scope

- Self-hosted runners.
- Replacing or refactoring the existing deploy hooks.
- Authoring new migrations or changing the migration framework.
- Resurrecting the Playwright E2E suite (deliberate per FR-016).
- Cleaning up `apps/*/playwright.config.ts` and the `e2e-ci` Nx targets — left in place; addressable in a future PR.
