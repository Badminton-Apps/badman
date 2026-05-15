---
description: "Task list for Twizzit Shadow Sync (initial backfill)"
---

# Tasks: Twizzit Shadow Sync

**Input**: Design documents from `/specs/016-twizzit-shadow-sync/`  
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: REQUIRED (plan.md — unit tests for ingest + opt-in integration against postgres). Co-located `*.spec.ts`; integration gated by `RUN_INTEGRATION_TESTS=1`.

**Organization**: User stories US1 (shadow persistence) and US2 (worker + orchestration) are both P1; US2 depends on US1 upsert primitives. Foundational phase blocks both.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 — maps to user stories in [spec.md](spec.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold Nx projects and workspace wiring before migrations or ingest code.

- [ ] T001 Generate `libs/backend/twizzit-shadow` via `npx nx g @nx/js:library twizzit-shadow --directory=libs/backend --unitTestRunner=jest --bundler=none --linter=eslint --importPath=@badman/backend-twizzit-shadow`
- [ ] T002 Scaffold `apps/worker/twizzit-shadow` by copying structure from `apps/worker/ranking/` (`project.json`, `webpack.config.js`, `tsconfig.*`, `eslint.config.js`, `src/main.ts`, `src/instrument.ts`) and renaming to `worker-twizzit-shadow` / port `WORKER_TWIZZIT_SHADOW_PORT`
- [ ] T003 Add `@badman/backend-twizzit-shadow` path mapping in `tsconfig.base.json`
- [ ] T004 [P] Document shadow-worker env vars in `.env.example` (`TWIZZIT_SHADOW_RUN_ON_BOOT`, `TWIZZIT_SHADOW_INTER_PAGE_DELAY_MS`, `TWIZZIT_SHADOW_PAGE_SIZE`, `TWIZZIT_SHADOW_FORCE_FULL_REFETCH`, `TWIZZIT_API_USER`, `TWIZZIT_API_PASS`)
- [ ] T005 [P] Add `deploy` target to `apps/worker/twizzit-shadow/project.json` mirroring `apps/worker/ranking/project.json` (`nx:run-commands` → `node ./scripts/render.js --app=worker_twizzit_shadow`)

**Checkpoint**: `nx build worker-twizzit-shadow` and `nx build backend-twizzit-shadow` succeed (empty stubs OK).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: PostgreSQL `twizzit` schema, Sequelize models (no GraphQL), and shared lib skeleton. **Blocks all user stories.**

- [ ] T006 Create `database/migrations/YYYYMMDDHHMMSS-create-twizzit-shadow-schema.js` — `CREATE SCHEMA twizzit`; tables per [data-model.md](data-model.md): `sync_run`, `sync_checkpoint`, `shadow_organization`, `shadow_extra_field`, `shadow_membership_type`, `shadow_membership`, `shadow_contact` (indexes on contact natural key + `member_id`); transactional `up`/`down`
- [ ] T007 [P] Create `libs/backend/database/src/models/twizzit/sync-run.model.ts` (Sequelize only, no `@ObjectType`)
- [ ] T008 [P] Create `libs/backend/database/src/models/twizzit/sync-checkpoint.model.ts`
- [ ] T009 [P] Create `libs/backend/database/src/models/twizzit/shadow-organization.model.ts`
- [ ] T010 [P] Create `libs/backend/database/src/models/twizzit/shadow-extra-field.model.ts`
- [ ] T011 [P] Create `libs/backend/database/src/models/twizzit/shadow-membership-type.model.ts`
- [ ] T012 [P] Create `libs/backend/database/src/models/twizzit/shadow-membership.model.ts`
- [ ] T013 [P] Create `libs/backend/database/src/models/twizzit/shadow-contact.model.ts` (`first_name`, `last_name`, `date_of_birth`, `member_id`, `payload` JSONB)
- [ ] T014 Export twizzit models from `libs/backend/database/src/models/twizzit/index.ts` and barrel `libs/backend/database/src/models/index.ts`
- [ ] T015 Ensure twizzit models are registered in `libs/backend/database/src/database.module.ts` (or Sequelize model array used by workers)
- [ ] T016 Create `libs/backend/twizzit-shadow/src/tokens.ts` — `FEDERATION_GATEWAY` injection token
- [ ] T017 Create `libs/backend/twizzit-shadow/src/twizzit-shadow.module.ts` — imports `DatabaseModule`, exports ingest services
- [ ] T018 Create `libs/backend/twizzit-shadow/src/pagination/page-runner.ts` — loop calling `fetchPage(offset, pageSize)` with `interPageDelayMs` sleep between pages; no truncate/resume logic yet
- [ ] T019 Add eslint boundary in `libs/backend/twizzit-shadow` banning imports from `@badman/backend-twizzit`, `@badman/backend-graphql`

**Checkpoint**: `npx sequelize-cli db:migrate` applies `twizzit` schema locally; models sync in a smoke script or integration stub.

---

## Phase 3: User Story 1 — Capture Twizzit Data Locally (Priority: P1) 🎯 MVP

**Goal**: Persist all five Twizzit entity types into `twizzit.shadow_*` with `payload` JSONB, identity columns on contacts, and per-record `sync_run_id` / `fetched_at`.

**Independent Test**: With mocked `FederationGateway` returning fixture pages, run ingest upsert path → rows queryable in `twizzit.shadow_contact` / `shadow_membership` with correct `twizzit_id`, `payload`, and contact `first_name`/`last_name`/`date_of_birth`/`member_id`.

### Tests for User Story 1

- [ ] T020 [P] [US1] Create `libs/backend/twizzit-shadow/src/shadow-upsert.service.spec.ts` — mock Sequelize models; verify upsert on `twizzit_id`, JSON `payload` round-trip, contact identity columns populated from `FederationContact`
- [ ] T021 [P] [US1] Add case in same spec: invalid/unpersistable row → skipped, logged, run continues (FR-014)

### Implementation for User Story 1

- [ ] T022 [P] [US1] Create `libs/backend/twizzit-shadow/src/shadow-upsert.service.ts` — `upsertOrganization`, `upsertExtraField`, `upsertMembershipType`, `upsertMembership`, `upsertContact` using Sequelize `bulkCreate` + `updateOnDuplicate` or equivalent; map `Federation*` → row shape per [data-model.md](data-model.md)
- [ ] T023 [US1] Create `libs/backend/twizzit-shadow/src/record-skip-tracker.ts` — collect skipped `{ entityType, twizzitId, reason }[]` for sync run metadata
- [ ] T024 [US1] Wire reference-entity ingest steps (organization → extra fields → membership types) in `libs/backend/twizzit-shadow/src/twizzit-shadow-ingest.service.ts` — no pagination; full list from `gateway.fetch*()`
- [ ] T025 [US1] Add paginated membership + contact page handlers in `twizzit-shadow-ingest.service.ts` using `page-runner.ts` (checkpoint hooks stubbed for US2)
- [ ] T026 [US1] Export public API from `libs/backend/twizzit-shadow/src/index.ts`

**Checkpoint**: Unit tests T020–T021 green; manual call to ingest service with mocks persists all entity types.

---

## Phase 4: User Story 2 — Initial Sync via Dedicated Worker (Priority: P1)

**Goal**: Separate Render worker runs full backfill via `TwizzitClient`; checkpoints + resume; 7-day full-re-fetch gate; truncate on full re-fetch; one-shot exit on `TWIZZIT_SHADOW_RUN_ON_BOOT=1`.

**Independent Test**: Start worker locally with boot flag + staging credentials → `twizzit.sync_run` reaches `completed`, checkpoints exist, interrupt/restart resumes from last offset without restarting from 0; second run within 7 days resumes (FR-015/FR-016).

### Tests for User Story 2

- [ ] T027 [P] [US2] Create `libs/backend/twizzit-shadow/src/sync-run.service.spec.ts` — create/run/complete/fail; `counts` + `skipped_ids` JSON
- [ ] T028 [P] [US2] Create `libs/backend/twizzit-shadow/src/run-mode.service.spec.ts` — last completed <7d → resume; >7d or `TWIZZIT_SHADOW_FORCE_FULL_REFETCH=1` → full re-fetch; full re-fetch triggers truncate (FR-016, FR-017)
- [ ] T029 [P] [US2] Extend `libs/backend/twizzit-shadow/src/twizzit-shadow-ingest.service.spec.ts` — checkpoint written per page; resume skips offsets ≤ last checkpoint

### Implementation for User Story 2

- [ ] T030 [US2] Add single-page fetch helpers on `TwizzitClient` in `libs/integrations/twizzit-client/src/client.ts` (e.g. `getContactsPage({ offset, pageSize })`) delegating to existing endpoint `fetchPage` — required for checkpointed pagination per [plan.md](plan.md) pagination note
- [ ] T031 [US2] Create `libs/backend/twizzit-shadow/src/sync-run.service.ts` — lifecycle `pending` → `running` → `completed`|`failed`; store `page_size`, `inter_page_delay_ms`, `counts`, `error_summary`, skipped records
- [ ] T032 [US2] Create `libs/backend/twizzit-shadow/src/sync-checkpoint.service.ts` — upsert `(sync_run_id, entity_type, last_offset, page_size, records_written)`
- [ ] T033 [US2] Create `libs/backend/twizzit-shadow/src/run-mode.service.ts` — implement FR-015/FR-016/FR-017 (resume vs full re-fetch vs truncate)
- [ ] T034 [US2] Create `libs/backend/twizzit-shadow/src/truncate-shadow-tables.service.ts` — truncate all `twizzit.shadow_*` entity tables (not `sync_run` / `sync_checkpoint` history unless specified in ADR — default: truncate shadow entity tables only)
- [ ] T035 [US2] Implement `runFullBackfill()` in `libs/backend/twizzit-shadow/src/twizzit-shadow-ingest.service.ts` per [contracts/shadow-ingest-service.md](contracts/shadow-ingest-service.md) — ordered pipeline, per-page transaction, checkpoint after commit, inter-page delay from config
- [ ] T036 [US2] Create `apps/worker/twizzit-shadow/src/app/app.module.ts` — `DatabaseModule`, `TwizzitShadowModule`, `ConfigModule`; wire `TwizzitClient` as `FEDERATION_GATEWAY` per [contracts/worker-bootstrap.md](contracts/worker-bootstrap.md) using `TWIZZIT_API_USER` / `TWIZZIT_API_PASS`
- [ ] T037 [US2] Create `apps/worker/twizzit-shadow/src/app/twizzit-shadow-runner.service.ts` — `onApplicationBootstrap`: if `TWIZZIT_SHADOW_RUN_ON_BOOT=1` call `runFullBackfill()` then `process.exit(code)`; else idle listen
- [ ] T038 [US2] Wire `apps/worker/twizzit-shadow/src/main.ts` — Nest Fastify bootstrap mirroring `apps/worker/ranking/src/main.ts`
- [ ] T039 [US2] Add structured logging per page (FR-010): `syncRunId`, `entityType`, `offset`, `recordsInPage`, `durationMs`

**Checkpoint**: `TWIZZIT_SHADOW_RUN_ON_BOOT=1 nx run worker-twizzit-shadow:serve` completes against staging Twizzit + local docker postgres; `quickstart.md` SQL checks pass.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Integration tests, docs alignment, CI, ops.

- [ ] T040 [P] Create `libs/backend/twizzit-shadow/test/twizzit-shadow-ingest.integration.spec.ts` — gated `RUN_INTEGRATION_TESTS=1`; sentinel cleanup on `twizzit.*`; one page per entity with mocked gateway or staging creds
- [ ] T041 [P] Update [research.md](research.md) and [plan.md](plan.md) — document FR-015–FR-017 (resume-first, 7-day rule, truncate-on-full-re-fetch) and per-environment DB pairing from clarifications
- [ ] T042 Update [quickstart.md](quickstart.md) with `TWIZZIT_SHADOW_FORCE_FULL_REFETCH` and 7-day resume behaviour
- [ ] T043 Run `nx test backend-twizzit-shadow` and `nx lint backend-twizzit-shadow` — all green
- [ ] T044 Run `nx build worker-twizzit-shadow` production configuration
- [ ] T045 Ops (manual): provision Render background worker for staging stack; register `system.Service` row `name='twizzit-shadow'` with `renderId`; confirm staging 1Password Twizzit key with BV before first full pull

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)** → **Phase 2 (Foundational)** → **Phase 3 (US1)** → **Phase 4 (US2)** → **Phase 5 (Polish)**
- US2 MUST NOT start before US1 upsert primitives (T022–T026) exist

### User Story Dependencies

| Story | Depends on | Delivers |
|-------|------------|----------|
| **US1** | Phase 2 | Shadow row upsert for all entity types |
| **US2** | US1 + Phase 2 | Sync run, checkpoints, worker, resume/truncate rules |

### Parallel Opportunities

- **Phase 1**: T004 ∥ T005 after T001–T003
- **Phase 2**: T007–T013 all parallel after T006
- **Phase 3**: T020 ∥ T021; T022 before T024–T025
- **Phase 4**: T027 ∥ T028 ∥ T029; T030 can start early (twizzit-client) in parallel with late US1
- **Phase 5**: T040 ∥ T041 ∥ T042

### Parallel Example: User Story 1

```bash
# Tests in parallel:
T020 shadow-upsert.service.spec.ts
T021 skip-on-error cases

# Models already done in Phase 2; implement upsert + ingest:
T022 shadow-upsert.service.ts → T024–T025 twizzit-shadow-ingest.service.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 + Phase 2 (migration + models)
2. Phase 3 (US1) — prove data lands in `twizzit.shadow_*` via unit tests with mocked gateway
3. **Stop and validate** before worker wiring

### Full feature (US1 + US2)

4. Phase 4 — worker + checkpoints + resume/truncate
5. Phase 5 — staging dry run on Render

### Incremental delivery

| Milestone | Outcome |
|-----------|---------|
| After Phase 2 | Schema ready |
| After US1 | Ingest logic testable without worker |
| After US2 | End-to-end backfill on staging |
| After T045 | Production-ready ops path |

---

## Notes

- **No** `@badman/backend-twizzit` (legacy XML) — use `@badman/integrations-twizzit-client` only
- **No** comparison to `public.Player` in this feature
- **Staging first** (FR-012): first production Render run uses production DB + production Twizzit creds only after staging validation
- Pagination checkpoint may require T030 in `twizzit-client` before T035 pipeline is complete
- Align [plan.md](plan.md) FR-015–017 in T041 — spec is authoritative after clarify session
