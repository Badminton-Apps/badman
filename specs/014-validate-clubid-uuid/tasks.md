---

description: "Task list for: Validate clubId as UUID at mutation boundary"
---

# Tasks: Validate `clubId` as UUID at mutation boundary

**Input**: Design documents in `specs/014-validate-clubid-uuid/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included by default. Constitution Principle IV (Resolver Test Discipline) makes resolver unit tests load-bearing for any mutation change.

**Organization**: Two user stories. US1 (P1) covers `recalculateTeamNumbersForGroup` — the originator of the observed Postgres error and the only mutation with a concurrency invariant tied to the canonical UUID. US2 (P2) brings the rest of the Club-scoped mutation surface in line. Each story is independently testable; US1 alone resolves the production log noise and the advisory-lock risk.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable — different file, no dependency on incomplete tasks.
- **[Story]**: `US1` / `US2` for story-phase tasks. No label for Setup, Foundational, or Polish.

## Path Conventions

Nx monorepo. All edits live under `libs/backend/graphql/src/`. Tests are co-located beside source as `*.spec.ts`. Spec doc updates land under `specs/014-validate-clubid-uuid/` and `specs/008-reorder-teams-atomic/`.

---

## Phase 1: Setup

**Purpose**: Add the one constant the rest of the feature pins to.

- [ ] T001 Add `BAD_USER_INPUT = "BAD_USER_INPUT"` to the `ErrorCode` enum/const in libs/backend/graphql/src/utils/error-codes.ts (insert alphabetically; if `BAD_USER_INPUT` is already present, mark complete with no edit)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement and test the shared `assertUUID` helper, then re-export it. Every user-story task calls this helper — nothing in Phase 3+ can start until this is green.

**⚠️ CRITICAL**: No user story work until this phase is complete.

- [ ] T002 Create libs/backend/graphql/src/utils/assert-uuid.ts with the signature, behavior, and `context`-merge rules defined in [contracts/assert-uuid-helper.md](contracts/assert-uuid-helper.md). Import `validate as isUUID` from `uuid` and `GraphQLError` from `graphql`. The helper MUST stay log-free per FR-009.
- [ ] T003 [P] Create libs/backend/graphql/src/utils/assert-uuid.spec.ts covering the full edge-case table in [contracts/assert-uuid-helper.md](contracts/assert-uuid-helper.md): lowercase UUID pass, uppercase UUID pass, empty-string throw, slug throw, UUID-shaped-non-hex throw, whitespace-wrapped throw, context-merge into `extensions`, and message includes `JSON.stringify(value)`.
- [ ] T004 Re-export `assertUUID` from libs/backend/graphql/src/utils/index.ts alongside `error-codes`. Verify with `nx build backend-graphql` that consumers resolve the symbol.

**Checkpoint**: `nx test backend-graphql --testPathPattern assert-uuid` green. Helper importable as `@badman/backend-graphql` util or via relative path from sibling resolvers.

---

## Phase 3: User Story 1 — Recalculate-numbers caller passes a slug, gets a clean error (Priority: P1) 🎯 MVP

**Goal**: `recalculateTeamNumbersForGroup` rejects non-UUID `clubId` with `BAD_USER_INPUT` before opening a transaction, acquiring the advisory lock, or running the permission check. The originator of the observed Postgres `22P02` log stops emitting it. The advisory-lock invariant is protected from slug-keyed callers.

**Independent Test**: Send `recalculateTeamNumbersForGroup(clubId: "smash-for-fun", ...)` against a running API. Assert `errors[0].extensions.code === "BAD_USER_INPUT"`, no Postgres log line, no transaction opened. See [quickstart.md](quickstart.md) "Verify the fix on the feature branch".

### Implementation for User Story 1

- [ ] T005 [US1] In libs/backend/graphql/src/resolvers/team/team-renumber.resolver.ts, at the top of `recalculateTeamNumbersForGroup` (line ~37, immediately after the entry log) call `assertUUID(clubId, "clubId", { userId })` BEFORE the existing authorization check at line 49. On throw, emit `this.logger.warn({ code: ErrorCode.BAD_USER_INPUT, field: "clubId", value: clubId, userId })` per FR-009. Use the helper, do not inline `isUUID`.
- [ ] T006 [US1] In libs/backend/graphql/src/resolvers/team/team-renumber.resolver.spec.ts add a test case: given `clubId = "smash-for-fun"`, the resolver throws `GraphQLError` with `extensions.code === ErrorCode.BAD_USER_INPUT`, `extensions.field === "clubId"`, `extensions.value === "smash-for-fun"`; assert the resolver's injected `Sequelize.transaction` mock is called zero times; assert the resolver's logger `warn` is called once with the expected payload. Use the existing test scaffolding in the same file (mocked `Sequelize`, fake `Player`).
- [ ] T007 [US1] Update specs/008-reorder-teams-atomic/contracts/team-renumber-mutation.md: (a) prepend a new step 1 to "Behavior (success)" — `"Validate clubId is a UUID. Not a UUID → BAD_USER_INPUT."` (renumber the subsequent steps); (b) append a row to the "Behavior (failure)" table: `| clubId is not a UUID | BAD_USER_INPUT | Nothing opened. No write. |`.
- [ ] T008 [US1] Update specs/008-reorder-teams-atomic/frontend-impact.md: append a "Required client behavior" bullet stating callers MUST pass `club.id` (UUID), not `club.slug`. Include the cached `club(id: slug) { id }` Apollo pattern from [contracts/club-mutation-input-policy.md](contracts/club-mutation-input-policy.md) "Migration note for callers".

**Checkpoint**: User Story 1 fully functional. `nx test backend-graphql --testPathPattern team-renumber.resolver` green including the new case. Manual repro from [quickstart.md](quickstart.md) section "Verify the fix on the feature branch" yields the BAD_USER_INPUT shape and zero postgres log lines.

---

## Phase 4: User Story 2 — Every Club-scoped mutation behaves consistently (Priority: P2)

**Goal**: The remaining 8 Club-scoped mutation entry points enforce the same UUID validation with the same error shape. A frontend developer who passes a slug to any of them gets `BAD_USER_INPUT` (not 22P02, not NotFoundException, not silent no-op).

**Independent Test**: For each mutation listed in [contracts/club-mutation-input-policy.md](contracts/club-mutation-input-policy.md), send a slug and assert the same `BAD_USER_INPUT` shape. None should reach postgres. See [quickstart.md](quickstart.md) "Spot-check the other mutations".

### Implementation for User Story 2

The four resolver files below are independent (no shared file edits), so the resolver edits are parallelizable. Each `[P]` resolver-edit task ships its own spec update in a paired non-parallel task because the `.spec.ts` either lives in the same file (`updateClub` adds cases to existing `club.resolver.spec.ts`, etc.) — pairs sharing a spec file are sequenced to avoid merge collisions.

- [ ] T009 [P] [US2] In libs/backend/graphql/src/resolvers/team/team.resolver.ts at `createTeam` (line ~174) and `createTeams` (line ~217), call `assertUUID(clubId, "clubId", { userId })` as the first statement of each mutation, followed by the `this.logger.warn(...)` warn-then-throw pattern from FR-009. Both writes happen in the same file — sequence the two edits within this task.
- [ ] T010 [US2] In libs/backend/graphql/src/resolvers/team/team.resolver.spec.ts add two test cases (one per mutation) mirroring T006: bad clubId → `BAD_USER_INPUT`, zero transactions, one warn log. Depends on T009.
- [ ] T011 [P] [US2] In libs/backend/graphql/src/resolvers/club/club.resolver.ts at `removeClub` (line ~228), `updateClub` (line ~256, validate `updateClubData.id`), and `addPlayerToClub` (line ~305, validate `addPlayerToClubData.clubId`), call `assertUUID(...)` + `this.logger.warn(...)` per FR-009. `clubs.club(id)` at line 58–73 stays UNTOUCHED — it's the read-side dual resolver.
- [ ] T012 [US2] In libs/backend/graphql/src/resolvers/club/club.resolver.spec.ts add three test cases (one per mutation) mirroring T006. Depends on T011.
- [ ] T013 [P] [US2] In libs/backend/graphql/src/resolvers/location/location.resolver.ts at `addLocation` (line ~75–100), validate `newLocationData.clubId` via `assertUUID(...)` + `this.logger.warn(...)`. If a `Logger` instance is not already in the class, add one following the pattern in `club.resolver.ts:51` (`private readonly logger = new Logger(LocationResolver.name);`).
- [ ] T014 [US2] Create libs/backend/graphql/src/resolvers/location/location.resolver.spec.ts (file does not exist today) following the reference pattern from [enrollmentSetting.resolver.spec.ts](../../libs/backend/graphql/src/resolvers/enrollmentSetting/enrollmentSetting.resolver.spec.ts): one test case for `addLocation` with bad `clubId`, asserting `BAD_USER_INPUT`, zero transactions, one warn log. Depends on T013.
- [ ] T015 [P] [US2] In libs/backend/graphql/src/resolvers/event/entry.resolver.ts at the two `clubId`-bearing mutations (lines ~125–145 and ~135–150 — confirm by grepping `Args("clubId"` and `Club.findByPk` in the file), call `assertUUID(...)` + `this.logger.warn(...)`.
- [ ] T016 [US2] In libs/backend/graphql/src/resolvers/event/entry.resolver.spec.ts add two test cases mirroring T006 for the two entry mutations. Depends on T015.
- [ ] T017 [US2] In libs/backend/graphql/src/resolvers/event/competition/submit-enrollment.service.ts callers: identify the resolver(s) that call this service with a `clubId` (grep `submitEnrollment\\|SubmitEnrollmentService`). At each of those resolver entry points (NOT inside the service), call `assertUUID(clubId, "clubId", { userId })` + warn-then-throw per FR-009 BEFORE invoking the service. Rationale: services must not throw `GraphQLError` (research decision 1).
- [ ] T018 [US2] Add spec cases for each caller resolver touched in T017, mirroring T006. Depends on T017. If the caller spec file does not exist, create it following the resolver-test reference pattern.

**Checkpoint**: All Club-scoped mutations consistently produce `BAD_USER_INPUT` on non-UUID input. `nx test backend-graphql` runs clean. The contract policy in [contracts/club-mutation-input-policy.md](contracts/club-mutation-input-policy.md) is fully realized across the inventory.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Lint, full test run, integration test verification, and manual quickstart walk.

- [ ] T019 Run `nx lint backend-graphql` and resolve any new lint findings introduced by Phase 2–4.
- [ ] T020 Run `nx test backend-graphql` and confirm 0 failures. New `BAD_USER_INPUT` cases green, pre-existing UUID-path cases green.
- [ ] T021 With docker up (`npm run docker:up`) and `RUN_INTEGRATION_TESTS=1`, run `npx jest --config libs/backend/graphql/jest.config.ts --testPathPattern team-renumbering.integration` to confirm the 008 integration suite still passes — this feature MUST NOT regress the UUID happy path.
- [ ] T022 Manual quickstart walk per [quickstart.md](quickstart.md) "Verify the fix on the feature branch", "Spot-check the other mutations", and "Verify the UUID path still works". Tail `docker compose logs -f postgres | grep "invalid input syntax"` during the walk — expect zero hits.
- [ ] T023 [P] Update [docs/tech-debt.md](../../docs/tech-debt.md) ONLY IF a remaining surface (`teamId`, `playerId`, `encounterId`, …) was identified during the walk that benefits from the same helper. Per research decision 6, those are out of scope but worth tracking as a follow-up. If nothing new surfaces, skip this task with a "no change needed" note.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)** → independent; start immediately.
- **Phase 2 (Foundational)** → depends on Phase 1 (`ErrorCode.BAD_USER_INPUT` must exist before helper compiles). Blocks every user story.
- **Phase 3 (US1, P1)** → depends on Phase 2.
- **Phase 4 (US2, P2)** → depends on Phase 2. Independent of Phase 3 — can run in parallel with US1 if multiple developers.
- **Phase 5 (Polish)** → depends on at least US1 complete; runs cleanly only when both stories are done.

### Within Each User Story

- The resolver-edit task and its paired spec-update task share a `.spec.ts` file → spec task depends on the resolver-edit task.
- The two doc-update tasks (T007, T008) under US1 are independent of T005/T006 and of each other; can run in parallel.

### Parallel Opportunities

- T003 ⫽ T002 (helper test parallel with helper impl — TDD-friendly).
- US2 resolver edits T009 ⫽ T011 ⫽ T013 ⫽ T015 (four different files, independent).
- T007 ⫽ T008 (two different doc files).
- T023 is `[P]` because it touches only `docs/tech-debt.md`.

---

## Parallel Example: User Story 2 with three developers

```bash
# Once Phase 2 is green, three developers split US2:
Developer A: T009 (team.resolver.ts edit) → T010 (paired spec) → done
Developer B: T011 (club.resolver.ts edit) → T012 (paired spec) → done
Developer C: T013 + T015 (location + entry edits) → T014 + T016 (paired specs) → done
Solo developer: pick T017 + T018 (enrollment caller path) — independent surface
```

---

## Implementation Strategy

### MVP (US1 only)

1. T001 (Setup) → T002 + T003 + T004 (Foundational) → T005..T008 (US1) → T019..T022 (Polish, with US2 spot-check skipped).
2. **STOP** and verify in production: the originating Postgres log line stops appearing for `recalculateTeamNumbersForGroup` traffic. The advisory-lock correctness risk is resolved. Ship.

### Full feature (US1 + US2)

Continue with Phase 4 after MVP ships, or interleave if team capacity allows. Each US2 mutation tightening is independent and can land in its own commit if the team prefers smaller PRs.

### Solo developer cadence

Sequence: T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023. Commit at each numbered task or logical group; commit after every spec-task pair at minimum to keep `git bisect` meaningful.

---

## Notes

- `[P]` = different file, no dependency on incomplete tasks.
- `[Story]` label maps each task to a user story; absent for Setup / Foundational / Polish.
- Every resolver edit MUST call the shared `assertUUID` helper — no inline `isUUID` checks. The helper is the single contract anchor.
- Every resolver edit MUST emit `this.logger.warn(...)` before the throw per FR-009. The helper stays log-free.
- Do NOT touch `clubs.club(id)` at libs/backend/graphql/src/resolvers/club/club.resolver.ts:58–73. It is the read-side dual resolver and the migration mechanism for the frontend.
- Do NOT add the helper inside `submit-enrollment.service.ts`. Services do not throw `GraphQLError`.
- Commit messages should reference T-IDs (e.g. `feat(backend-graphql): T005 reject non-UUID clubId in recalculate mutation`).
