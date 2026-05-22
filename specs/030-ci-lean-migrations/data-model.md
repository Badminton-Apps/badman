# Phase 1 Data Model: Lean CI with Automated Migrations

This feature does **not** introduce any new persistent application entities — no new Sequelize models, no new database tables, no new GraphQL types. The data model here describes the *workflow-level entities* the pipeline operates on, mirroring the **Key Entities** section of `spec.md`.

## E1. CI Workflow Run

A single execution of `pull-request.yml` against a pull request.

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | string | GitHub Actions run ID | Used in URLs `…/actions/runs/{id}` |
| `pr_number` | number | `github.event.pull_request.number` | Branch protection observes this run |
| `head_sha` | string | `github.event.pull_request.head.sha` | The commit under test |
| `status` | enum | GitHub | `pending` / `success` / `failure` / `cancelled` |
| `duration_seconds` | number | GitHub | Used to verify SC-002 (≤8 min median) |
| `steps_executed` | string[] | Workflow logs | Each step name |
| `nx_affected_projects` | string[] | `nx affected --plain` output (captured in step summary) | For audit |

**Lifecycle**: `queued` → `in_progress` → (`success` | `failure` | `cancelled`). Terminal state is what branch protection reads.

**Validation rules** (enforced by the pipeline, not application code):
- A run MUST report a single top-level pass/fail (FR-003). Achieved by a single `main` job whose conclusion is the run conclusion.
- A run MUST NOT contact a non-local DB (FR-004). Enforced by absence of any DB secret in the workflow's job environment.

## E2. Promotion Run

A single execution of either `deploy-staging.yml` (target = staging) or `deploy-production.yml` (target = production).

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | string | GitHub Actions run ID | |
| `target_environment` | enum | `staging` \| `production` | Drives concurrency group |
| `trigger` | enum | `push` \| `workflow_dispatch` | |
| `triggering_ref` | string | `staging` or `main` | Always one or the other; PRs don't trigger this |
| `triggering_sha` | string | `github.sha` | |
| `migrations_applied` | string[] | Parsed from `sequelize-cli` stdout | List of filenames, possibly empty |
| `migration_outcome` | enum | `success` \| `failure` \| `skipped-no-pending` | |
| `deploy_outcome` | enum | `success` \| `failure` \| `not-attempted` | `not-attempted` when migration failed (FR-009) |
| `approver` | string \| null | GitHub Environment approval event | Required non-null when `target_environment = production` (FR-014) |
| `approval_timestamp` | timestamp \| null | Same | |

**Lifecycle** (production):
`queued` → `waiting-for-approval` → (`approved` → `migrating` → (`migrated` → `deploying` → (`deployed` | `deploy-failed`) | `migration-failed`)) | `rejected`

**Lifecycle** (staging):
`queued` → `migrating` → (`migrated` → `deploying` → (`deployed` | `deploy-failed`) | `migration-failed`)

**Validation rules**:
- When `migration_outcome = failure`, `deploy_outcome` MUST be `not-attempted` (FR-009, SC-007).
- `migrations_applied` MAY be empty (no-op migration run is success per FR-008).
- For production: `approver` MUST be a user with the reviewer role on the `production` environment (FR-014).

## E3. Migration Record (existing, not authored by this feature)

A row in the database's `SequelizeMeta` table identifying a migration file that has been applied. This is the migration framework's own metadata, not something this feature creates.

| Field | Type | Source | Notes |
|---|---|---|---|
| `name` | string PK | `sequelize-cli` | Migration filename (e.g. `20260520120000-add-index.js`) |

**Validation rules**:
- Idempotency (FR-008): `db:migrate` reads this table, applies only files not yet present, then inserts a row per file. The pipeline does not write to this table directly.
- Per-environment isolation: staging's `SequelizeMeta` and production's `SequelizeMeta` are independent. This is what makes per-environment serialization (R4) sufficient — there is no cross-environment race.

## E4. Target Environment

A named GitHub Environment plus its associated database. The feature configures two:

| Name | DB Secret | Deploy Hooks (Environment secrets) | Protection Rules |
|---|---|---|---|
| `staging` | `DB_IP`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_DIALECT`, `DB_SSL` | `STAGING_API_HOOK`, `STAGING_WORKER_SYNC_HOOK`, `STAGING_WORKER_RANKING_HOOK` | None (push to `staging` is the gate) |
| `production` | `DB_IP`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_DIALECT`, `DB_SSL` | `PROD_API_HOOK`, `PROD_WORKER_SYNC_HOOK`, `PROD_WORKER_RANKING_HOOK` | Required reviewer(s) on every job that declares `environment: production` |

**Validation rules**:
- All secrets MUST be Environment-scoped, never repository-scoped (FR-013, R3).
- Reviewers on `production` MUST be at least one human (no apps) and MUST NOT include the PR author of the triggering change. (GitHub enforces the "PR author cannot self-approve" rule natively when the appropriate environment setting is enabled — set it.)

## Relationships

```text
CI Workflow Run    1..* — 1   Pull Request
Promotion Run      *   — 1   Target Environment
Promotion Run      *   — *   Migration Record   (via migrations_applied[])
Migration Record   *   — 1   Target Environment (via the DB it lives in)
```

No persistent storage is added by this feature — these relationships exist only as state inside GitHub Actions runs and Postgres metadata.
