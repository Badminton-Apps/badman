# Phase 0 Research: Twizzit Shadow Sync

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-05-15

Resolves planning unknowns for initial Twizzit shadow ingestion. Comparison to Badman `Player` / `ClubPlayerMembership` is explicitly deferred.

---

## R1. Worker topology on Render

**Decision**: Add a **new lean NestJS worker app** `apps/worker/twizzit-shadow`, deployed as its **own Render background service** (separate from `apps/api` and `apps/worker/sync`). Do **not** queue jobs on the existing Bull `sync` queue or extend `sync-twizzit` in `worker-sync`.

**Rationale**:

- Spec FR-005 / SC-002 require isolating bulk Twizzit HTTP from the API and from encounter/ranking sync workloads.
- `worker-sync` is orchestrated via Bull + Render resume/suspend for short-lived encounter jobs; Twizzit backfill is a **long-running, few-run** batch job with different lifecycle (manual start, hours of paging, then stop).
- Legacy `sync-twizzit` uses XML/`TwizzitService` (old integration), not `@badman/integrations-twizzit-client`; shadow work should not inherit that path.

**Alternatives considered**:

- Reuse `worker-sync` + new Bull processor — rejected; couples unrelated orchestration and keeps legacy Twizzit code in the hot path.
- Run inside `apps/api` on demand — rejected; violates spec and risks API latency under ~160k contact pages.

**Render ops**: Register a new `system.Service` row (e.g. `name = "twizzit-shadow"`) with `renderId` when the Render service is created. No API orchestrator auto-start for v1 — operators **manually resume** the Render service or set `TWIZZIT_SHADOW_RUN_ON_BOOT=1` for a one-shot run. Document in `quickstart.md`.

---

## R2. Trigger model (one-time / few runs)

**Decision**: Worker supports two entry modes:

1. **One-shot on boot** — env `TWIZZIT_SHADOW_RUN_ON_BOOT=1` runs a full backfill pipeline then **exits** (`process.exit(0)` on success, non-zero on fatal failure). Intended for Render manual deploy / shell.
2. **Local / CI dev** — `nx run worker-twizzit-shadow:serve` with the same env, or a future `nx run worker-twizzit-shadow:backfill` executor target wrapping the same service.

No `system.CronJobs` row and no recurring Bull schedule in v1 (spec FR-006). Re-runs are explicit operator actions.

**Rationale**: Spec positions this worker as temporary until `lastModifiedDate` exists; cron infrastructure adds ops burden without benefit for a one-off backfill.

**Alternatives considered**:

- Cron nightly full pull — rejected for v1 (rate limits + spec scope).
- Bull job from API — rejected; unnecessary coupling; manual Render control is enough.

---

## R3. PostgreSQL schema placement

**Decision**: New PostgreSQL schema **`twizzit`** with shadow tables + run metadata. Migrations under `database/migrations/` (date-prefixed JS, transactional `up`/`down`).

**Rationale**:

- FR-001 requires separation from operational `public.Player` / `ClubPlayerMembership`.
- Dedicated schema keeps dumps, permissions, and future drop/replace of shadow data simple.
- Aligns with existing multi-schema convention (`system`, `event`, `ranking`, …).

**Alternatives considered**:

- `public` tables with `shadow_` prefix — rejected; pollutes domain schema and complicates later cutover.
- JSON files on disk — rejected; not queryable for later comparison work.

---

## R4. Row shape: JSONB snapshot + indexed identity columns

**Decision**: Each entity table stores:

- **Stable Twizzit key** (`twizzit_id` BIGINT, unique per table) — from `Federation*.id`
- **Denormalised query columns** where useful for later diff (contacts: `first_name`, `last_name`, `date_of_birth`, `member_id`; memberships: `contact_id`, `club_id`, `membership_type_id`, `start_date`, `end_date`)
- **`payload` JSONB** — serialised `Federation*` object post-client validation (lossless for comparison)
- **Ingest metadata** — `sync_run_id` (UUID FK), `fetched_at` (timestamptz)

Upsert on `(twizzit_id)` per table; latest fetch wins for a given run (idempotent re-run).

**Rationale**:

- Preserves full API fidelity (FR-002, FR-002a) including `extraFields` / Member ID without dozens of nullable columns.
- Indexed natural key on contacts supports duplicate-key analysis (first+last+DOB collisions) without JSONB parsing.
- Client already normalises wire → `Federation*`; storing that shape avoids re-parsing kebab-case in SQL.

**Alternatives considered**:

- Raw wire JSON only — rejected; harder to query; client validation already paid for.
- Fully normalised relational shadow schema — rejected; high migration cost, low value before comparison spec exists.

---

## R5. Ingest order & checkpoint granularity

**Decision**: Single pipeline with **entity-ordered steps** and **per-entity offset checkpoints**:

| Step | Entity | Pagination | Notes |
|------|--------|------------|-------|
| 1 | Organization | No | Single row; seed `organization_id` on run |
| 2 | Extra fields | No | Reference schema |
| 3 | Membership types | No | Reference |
| 4 | Memberships | `limit`/`offset` via client | Large; checkpoint after each committed page |
| 5 | Contacts | `limit`/`offset` via client | Largest (~160k+); checkpoint after each page |

Checkpoint record: `(sync_run_id, entity_type, last_offset, page_size, records_written)`. On resume, skip pages `offset <= last_offset` for that entity.

**Rationale**:

- Matches `docs/twizzit/twizzit-api-reference-index.md` entity set.
- Memberships before contacts is acceptable for shadow (full copy, not production reconcile); contacts last keeps the longest step resumable where failures are most likely.
- Page-level checkpoint satisfies FR-009 / SC-003 without row-level overhead.

**Inter-page pacing**: Env `TWIZZIT_SHADOW_INTER_PAGE_DELAY_MS` (default **250** ms) sleep between successful pages, in addition to client-internal 429 backoff (`TwizzitClient` retry policy). Tunable on Render without redeploy.

**Alternatives considered**:

- Contacts-first — rejected; memberships reference `contact-id` but shadow stores FKs as data only; order matters less than rate-limit friendliness (finish smaller tables first for partial progress signal).
- Single global offset — rejected; entities have independent pagination streams.

---

## R6. Rate limits & client retry

**Decision**: Delegate HTTP 429 / 401 handling to **`TwizzitClient`** defaults from spec 015 (`maxRateLimitRetries: 3`, `maxRetryBudgetMs: 120_000`). Worker adds only **inter-page delay** (R5) and **does not** implement a second retry layer.

**Rationale**: Avoid duplicate backoff logic; client already classifies `TwizzitRateLimitError` and logs endpoint context.

**Open action** (non-blocking): Confirm published rate limits with Twizzit (gap Q3 in `docs/twizzit/gaps-and-open-questions.md`). Tune `TWIZZIT_SHADOW_INTER_PAGE_DELAY_MS` after first staging full pull.

---

## R7. Sequelize models without GraphQL

**Decision**: Shadow tables use **Sequelize-typescript models only** (no `@ObjectType` / `@Field`). Models live in `libs/backend/database/src/models/twizzit/` and are exported from the database barrel. **No GraphQL resolvers** in v1.

**Rationale**: Shadow rows are ETL staging, not Badman domain entities exposed to clients. Principle I targets user-facing domain models; exposing 160k shadow contacts via GraphQL would be incorrect.

**Constitution**: Logged in plan **Complexity Tracking** (Principle I narrow exception).

---

## R8. Library boundaries

**Decision**:

| Package | Responsibility |
|---------|----------------|
| `@badman/integrations-twizzit-client` | HTTP + zod + pagination (existing) |
| `@badman/backend-twizzit-shadow` (new) | Ingest service, checkpoint logic, run orchestration |
| `@badman/backend-database` | Sequelize models + migrations |
| `apps/worker/twizzit-shadow` | Nest bootstrap, config, Winston logger adapter, one-shot runner |

`@badman/backend-twizzit` (legacy XML service) MUST NOT be imported by shadow code.

---

## R9. Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `TWIZZIT_USERNAME` | yes | Client credentials |
| `TWIZZIT_PASSWORD` | yes | Client credentials |
| `TWIZZIT_API` | no | Base URL override (default prod host) |
| `TWIZZIT_ORGANIZATION_ID` | no | Skip `GET /organizations` when known |
| `TWIZZIT_SHADOW_RUN_ON_BOOT` | no | `1` → run pipeline then exit |
| `TWIZZIT_SHADOW_INTER_PAGE_DELAY_MS` | no | Pacing between pages (default 250) |
| `TWIZZIT_SHADOW_PAGE_SIZE` | no | Passed to client `pageSize` (default 100) |
| `DB_*` / existing Sequelize env | yes | Same as API/workers |

Credentials via Render env / 1Password (F1.3 in `docs/twizzit/Requirements.md`).

---

## R10. Testing strategy

**Decision**:

- **Unit**: `TwizzitShadowIngestService` with mocked `FederationGateway` + mocked Sequelize transaction; assert upsert calls, checkpoint writes, resume skips pages.
- **Integration** (opt-in `RUN_INTEGRATION_TESTS=1`): real postgres, truncate `twizzit.*` sentinel scope, run one page per entity against fixtures or staging credentials.
- **No live Twizzit in CI** by default.

**Rationale**: Matches repo conventions (`*.integration.spec.ts` gate) and 015 client testing split.
