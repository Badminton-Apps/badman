# Contract: `_shared-migrate.yml` Reusable Workflow

The migration runner is the single point where this feature touches a production database. Its contract is therefore the most safety-critical artifact in the design.

## Interface

```yaml
# .github/workflows/_shared-migrate.yml
name: Reusable — Run Migrations

on:
  workflow_call:
    inputs:
      target-environment:
        description: "staging | production — drives both `environment:` and the concurrency group key"
        required: true
        type: string

# Secrets: none declared. The called `migrate` job declares `environment: ${{ inputs.target-environment }}`,
# which grants access to the env-scoped DB_* secrets. Caller passes `secrets: inherit`.
```

## Caller contract

A calling workflow MUST:

1. Pass `secrets: inherit` so the reusable workflow can read env-scoped secrets. The `environment:` declaration lives on the called workflow's `migrate` job — not on the caller.
2. The reusable workflow sets `concurrency: { group: migrate-${{ inputs.target-environment }}, cancel-in-progress: false }` on its own job. Caller does NOT set this.
3. Trust env-scoped secret resolution: `DB_IP`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_DIALECT`, `DB_SSL` MUST exist as Environment secrets in both `staging` and `production`.
4. Run the `migrate-*` job downstream of the `build` job via `needs:`, so a failing build prevents schema changes.

A calling workflow MUST NOT:

1. Pass any DB credential from a repository-level secret.
2. Use `cancel-in-progress: true` on a migration job.
3. Run the migration job in parallel with another migration job targeting the same environment.

## Behavior contract

When invoked, the reusable workflow performs, in order:

1. **Setup** — checkout (shallow is fine; no Nx affected here), Node via `setup-node@v4` with `node-version-file: ${{ inputs.node-version-file }}`, `npm ci`.
2. **Pre-flight: invalid-index check** — runs `node scripts/migrations/check-invalid-indexes.js`. Fails the workflow with a clear, named list of `schema.index` entries if any `pg_index.indisvalid = false` rows exist (FR-011, SC-008). The script reads the seven `DB_*` env vars (same shape as `database/config/config.js`).
3. **Apply migrations** — runs `npx sequelize-cli db:migrate --debug` with `NODE_ENV=${{ inputs.target-environment }}` and the seven `DB_*` env vars exported from env-scoped secrets. Captures stdout to `migrate.log`.
4. **Parse + report** — extracts the migration filenames Sequelize logged as applied, writes them to `$GITHUB_STEP_SUMMARY` (FR-010). If zero migrations applied, writes "No pending migrations." (FR-008).
5. **Surface failure** — if step 3 exits non-zero, dump the last 50 lines of `migrate.log` to the step summary, ensure the failing filename is prominent, and exit non-zero so dependent deploy jobs do not run (FR-009, SC-007).

The reusable workflow does NOT:
- Roll back applied migrations on its own. (Sequelize migrations have their own `down`; rollback is a deliberate operator action, not an automated retry.)
- Retry on connection failure. Edge-case spec line: "fail fast with a clear error and not retry indefinitely."
- Read or write any file under `database/migrations/`. It only invokes the framework.

## Inputs / outputs

| Direction | Name | Value |
|---|---|---|
| Input | `target-environment` | `staging` or `production` |
| Secrets | (inherited via `secrets: inherit`) | The seven `DB_*` env vars, env-scoped |
| Output | (none) | Result is observable via job conclusion + step summary |

## Test plan (acceptance verification)

Each row is a deliberate fixture exercised once on a throwaway branch / staging DB before the feature ships:

| # | Fixture | Expected |
|---|---|---|
| T1 | Push to `staging` with no pending migrations | Migration job green; step summary says "No pending migrations." |
| T2 | Push to `staging` with one new migration | Migration job green; filename in step summary; row appears in `SequelizeMeta`. |
| T3 | Re-run T2's workflow (`workflow_dispatch`) | Migration job green; "No pending migrations." (FR-008, US2 scenario 4). |
| T4 | Push to `staging` with a migration whose `up` `throw new Error('boom')` | Migration job red with filename surfaced; `deploy-staging` does NOT run (FR-009, SC-007). |
| T5 | Manually leave an `INVALID` index on staging DB, then push any migration | Migration job red at pre-flight step with index name surfaced (FR-011, SC-008). |
| T6 | Push to `staging` while a previous migration is mid-flight | Second run waits at `concurrency: migrate-staging`; first run completes; second runs (or no-ops if first already applied). No cancellation. |
| T7 | Open a PR from a fork that adds a fake `DB_PASSWORD` secret read in a workflow change | The PR's run cannot read the Environment secret; resolves to empty string. |

T1–T6 are the happy + unhappy paths called out in spec acceptance scenarios. T7 verifies the secrets-scoping rationale from R3.
