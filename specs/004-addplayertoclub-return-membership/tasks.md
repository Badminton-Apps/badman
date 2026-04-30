---

description: "Tasks for ClubPlayerMembership Resolver Upgrades (BAD-129)"
---

# Tasks: ClubPlayerMembership Resolver Upgrades

**Input**: Design documents from `/specs/004-addplayertoclub-return-membership/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: Required per Constitution Principle IV and spec FR-011/FR-012. Test tasks are included.

**Organization**: Tasks grouped by user story for independent implementation and verification.

## Format: `[ID] [P?] [Story?] Description with file path`

## Path Conventions

NestJS Nx monorepo. Affected paths:
- `libs/backend/graphql/src/utils/` — error codes
- `libs/backend/graphql/src/resolvers/club/` — resolver, result object, tests

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No project initialization needed — operating in existing libs. Single sanity-check task.

- [x] T001 Verify local API + Postgres + Redis stack is healthy (`npm run docker:up` already running; `nx test backend-graphql` baseline run produces a clean pass before changes)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared registry change that all classified-error work depends on.

**⚠️ CRITICAL**: T002 must complete before any task in Phase 4 or Phase 5 can compile cleanly.

- [x] T002 Add `MEMBERSHIP_NOT_FOUND: "MEMBERSHIP_NOT_FOUND"` under a new `// Club membership (libs/backend/graphql/src/resolvers/club/club.resolver.ts)` comment block in `libs/backend/graphql/src/utils/error-codes.ts`

**Checkpoint**: Error registry includes `MEMBERSHIP_NOT_FOUND`. User story implementation can begin.

---

## Phase 3: User Story 1 — Enrollment wizard adds transfer/loan and gets membership ID back (Priority: P1) 🎯 MVP

**Goal**: `addPlayerToClub` returns the created/existing `ClubPlayerMembership` (via `AddPlayerToClubResult`) so the BAD-120 frontend wizard can immediately delete the membership without a second lookup.

**Independent Test**: Call `addPlayerToClub` mutation; assert response carries `id`, `clubId`, `playerId`, `start`, `end`, `membershipType`, `alreadyExisted`. Call again with same `(clubId, playerId, start)`; assert `alreadyExisted: true` and the same `id`.

### Implementation for User Story 1

- [x] T003 [P] [US1] Create `AddPlayerToClubResult` `@ObjectType` in `libs/backend/graphql/src/resolvers/club/add-player-to-club-result.object.ts` with fields `id: ID`, `clubId: ID`, `playerId: ID`, `start: Date`, `end: Date (nullable)`, `membershipType: String`, `alreadyExisted: Boolean` — mirror the description style of `TeamResult`/`EnrollmentResult`

- [x] T004 [US1] In `libs/backend/graphql/src/resolvers/club/club.resolver.ts`: change `@Mutation(() => Boolean)` decorator on `addPlayerToClub` to `@Mutation(() => AddPlayerToClubResult)`; update return type annotation to `Promise<AddPlayerToClubResult>`; import the new result class

- [x] T005 [US1] In `addPlayerToClub` body: replace `throw new UnauthorizedException(...)` with `throw new GraphQLError("Permission denied", { extensions: { code: ErrorCode.PERMISSION_DENIED } })`; ensure auth check runs before the transaction is opened

- [x] T006 [US1] In `addPlayerToClub` body: replace the two `NotFoundException` throws (club, player) with `GraphQLError` carrying `extensions.code` `CLUB_NOT_FOUND` (with `{ clubId }`) and `PLAYER_NOT_FOUND` (with `{ playerId }`) respectively

- [x] T007 [US1] In `addPlayerToClub` body: replace `await club.addPlayer(player, { transaction, through: { ... } })` + `return true` with `await ClubPlayerMembership.findOrCreate({ where: { clubId, playerId, start }, defaults: { end, membershipType, confirmed }, transaction })`; build and return an `AddPlayerToClubResult` from the resolved `[membership, created]` tuple with `alreadyExisted: !created`

- [x] T008 [US1] Update imports in `club.resolver.ts`: add `GraphQLError` from `graphql`, `ErrorCode` from `../../utils/error-codes`, and `AddPlayerToClubResult` from `./add-player-to-club-result.object`; verify `ClubPlayerMembership` is already imported from `@badman/backend-database`

**Checkpoint**: `addPlayerToClub` returns `AddPlayerToClubResult` with idempotent `alreadyExisted` flag and classified errors. The frontend can delete by `id` immediately. US1 is functionally complete.

---

## Phase 4: User Story 2 — Clients receive machine-readable error codes (Priority: P1)

**Goal**: All three ClubPlayerMembership mutations throw `GraphQLError` with `extensions.code` from the shared registry — never `UnauthorizedException` / `NotFoundException`.

**Independent Test**: Call each mutation under each failure path (unauthorized, not-found); assert `error.extensions.code` matches the contract table from `plan.md`.

> Note: `addPlayerToClub` error-code work is bundled into US1 (T005, T006). This phase upgrades the remaining two mutations.

### Implementation for User Story 2

- [x] T009 [US2] In `updateClubPlayerMembership` (`club.resolver.ts`): replace `throw new NotFoundException(\`${ClubPlayerMembership.name}: ${data.id}\`)` with `throw new GraphQLError("Membership not found", { extensions: { code: ErrorCode.MEMBERSHIP_NOT_FOUND, membershipId: data.id } })`

- [x] T010 [US2] In `updateClubPlayerMembership`: replace `throw new UnauthorizedException(...)` with `throw new GraphQLError("Permission denied", { extensions: { code: ErrorCode.PERMISSION_DENIED } })`

- [x] T011 [US2] In `removePlayerFromClub` (`club.resolver.ts`): replace the membership-lookup `NotFoundException` with `GraphQLError` carrying `MEMBERSHIP_NOT_FOUND` (with `{ membershipId: id }`)

- [x] T012 [US2] In `removePlayerFromClub`: replace `UnauthorizedException` with `GraphQLError` carrying `PERMISSION_DENIED`

- [x] T013 [US2] In `removePlayerFromClub`: remove the dead `Club.findByPk` and `Player.findByPk` lookups and their associated `NotFoundException` throws (per research.md Finding 4 — FK constraints make them redundant)

- [x] T014 [US2] Drop unused `NotFoundException` and `UnauthorizedException` imports from `@nestjs/common` in `club.resolver.ts`; verify no other resolver mutation in this file still uses them. If other mutations still use them (e.g. `createClub`, `updateClub`), keep the imports.

**Checkpoint**: All three target mutations throw classified `GraphQLError`s. Zero `NotFoundException`/`UnauthorizedException` left in the three target mutations. SC-004 satisfied.

---

## Phase 5: User Story 4 — Resolver test coverage matches the rest of the codebase (Priority: P2)

**Goal**: Co-located `club.resolver.spec.ts` covers the standard CRUD case matrix per Constitution IV, including idempotent re-add for `addPlayerToClub`.

**Independent Test**: `nx test backend-graphql --testPathPattern=club.resolver.spec.ts` runs all 13 cases green.

> Note: Spec US3 (no regressions) is verified by Phase 6 polish tasks (running the full backend-graphql test suite + typecheck).

### Test scaffolding

- [x] T015 [US4] If `libs/backend/graphql/src/resolvers/club/club.resolver.spec.ts` does not exist, create it; if it exists, add a new `describe("ClubsResolver", ...)` with `beforeEach` setting up `Test.createTestingModule` with `ClubsResolver` and a fake `Sequelize` (transaction returns `{ commit: jest.fn(), rollback: jest.fn() }`). Add `afterEach(() => jest.restoreAllMocks())`. Mirror layout of `team.resolver.spec.ts`.

### Tests for `addPlayerToClub` (5 cases)

- [x] T016 [P] [US4] Add test "rejects unauthorized" — fake `Player` with `hasAnyPermission` returning `false`; expect `GraphQLError` with `extensions.code === "PERMISSION_DENIED"`

- [x] T017 [P] [US4] Add test "throws CLUB_NOT_FOUND when club missing" — `jest.spyOn(Club, "findByPk").mockResolvedValue(null)`; expect `GraphQLError` with `extensions.code === "CLUB_NOT_FOUND"` and `extensions.clubId` set

- [x] T018 [P] [US4] Add test "throws PLAYER_NOT_FOUND when player missing" — `Club.findByPk` returns fake club, `Player.findByPk` returns null; expect `GraphQLError` with `extensions.code === "PLAYER_NOT_FOUND"` and `extensions.playerId` set

- [x] T019 [P] [US4] Add test "creates membership and returns alreadyExisted=false" — spy `ClubPlayerMembership.findOrCreate` to return `[fakeMembership, true]`; assert returned `AddPlayerToClubResult` has `alreadyExisted: false`, `id`, `clubId`, `playerId`, `start`, `membershipType` from the fake; assert `transaction.commit` called

- [x] T020 [P] [US4] Add test "idempotent re-add returns alreadyExisted=true" — spy `ClubPlayerMembership.findOrCreate` to return `[fakeExistingMembership, false]`; assert returned `AddPlayerToClubResult` has `alreadyExisted: true` and the existing `id`; assert no fresh row created (the `created` flag from Sequelize is the source of truth)

### Tests for `updateClubPlayerMembership` (4 cases)

- [x] T021 [P] [US4] Add test "throws MEMBERSHIP_NOT_FOUND when membership missing" — `jest.spyOn(ClubPlayerMembership, "findByPk").mockResolvedValue(null)`; expect `GraphQLError` with `extensions.code === "MEMBERSHIP_NOT_FOUND"` and `extensions.membershipId` set

- [x] T022 [P] [US4] Add test "rejects unauthorized" — `findByPk` returns fake membership; fake user `hasAnyPermission` returns `false`; expect `PERMISSION_DENIED`

- [x] T023 [P] [US4] Add test "successful update commits transaction" — `findByPk` returns fake membership with `update: jest.fn().mockResolvedValue(...)`; assert `transaction.commit` called and resolver returns `true`

- [x] T024 [P] [US4] Add test "rolls back when update throws" — `update` rejects with `new Error("boom")`; assert `transaction.rollback` called and the error is rethrown

### Tests for `removePlayerFromClub` (4 cases)

- [x] T025 [P] [US4] Add test "throws MEMBERSHIP_NOT_FOUND when membership missing" — `findByPk` returns null; expect `GraphQLError` with `MEMBERSHIP_NOT_FOUND` and `membershipId` extension

- [x] T026 [P] [US4] Add test "rejects unauthorized" — `findByPk` returns fake membership; user permission false; expect `PERMISSION_DENIED`

- [x] T027 [P] [US4] Add test "successful destroy commits transaction" — fake membership with `destroy: jest.fn().mockResolvedValue(...)`; assert `transaction.commit` called and resolver returns `true`

- [x] T028 [P] [US4] Add test "rolls back when destroy throws" — `destroy` rejects; assert `transaction.rollback` called and error rethrown

**Checkpoint**: All 13 test cases pass. Constitution IV satisfied for the three target mutations.

---

## Phase 6: Polish & Cross-Cutting (verifies US3 — no regressions)

**Purpose**: Ensure existing callers and the wider backend-graphql suite still work; verify spec SC-001 (100% test pass) and SC-002 (zero regressions).

- [x] T029 Run `nx test backend-graphql` — all suites must pass

- [x] T030 Run `nx lint backend-graphql` — must pass (pre-existing package.json dependency-check errors are not introduced by this change; 0 new issues introduced)

- [x] T031 Run `nx build backend-graphql` and `nx build api` — both must compile cleanly (catches missed import / missing field issues that ts-tests can't)

- [ ] T032 Boot the API once (`nx run api:serve` until "Listening" log) so `nestjs-i18n` regenerates `i18n.generated.ts` if it touched anything tangential; commit the regen if changed (per Constitution Principle II)

- [ ] T033 [P] Manual smoke: with the API running, exercise the new mutation via an introspection client — call `addPlayerToClub` with a valid `(clubId, playerId, start)`; verify response shape matches `AddPlayerToClubResult`. Call again with the same values; verify `alreadyExisted: true`.

- [x] T034 [P] Update the per-code `extensions` payload documentation: append a "Error Codes" section to `specs/004-addplayertoclub-return-membership/plan.md` (or this tasks.md notes section) confirming `MEMBERSHIP_NOT_FOUND` carries `{ membershipId: string }` — already documented in plan.md Error contract table. Verify still accurate after implementation.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: T001 — independent.
- **Phase 2 (Foundational)**: T002 must complete before T009/T011/T021/T025 can compile.
- **Phase 3 (US1)**: Depends on Phase 2 (T002). T003 is parallelizable with T002.
- **Phase 4 (US2)**: Depends on Phase 2 (T002).
- **Phase 5 (US4 tests)**: Depends on T015 (file scaffold) for all subsequent tests; the test file imports from the resolver, so T004–T014 should land first to make the tests realistic. Tests can be written before the impl if TDD is preferred — they will fail until impl lands.
- **Phase 6 (Polish)**: Depends on Phases 3–5 complete.

### User Story Independence

- **US1 (Phase 3)**: Independently testable — `addPlayerToClub` works with new shape.
- **US2 (Phase 4)**: Independently testable — `update` and `remove` throw classified codes; can be implemented and shipped without US1 (but the BAD-120 frontend needs US1).
- **US4 (Phase 5)**: Tests depend on US1+US2 implementation; can be staged in parallel by writing them as red tests first.

### Parallel Opportunities

- T003 (result object) parallel with T002 (error code).
- All of T016–T020 ([P] [US4]) parallel with each other once T015 + impl land.
- All of T021–T024 ([P] [US4]) parallel.
- All of T025–T028 ([P] [US4]) parallel.
- T033, T034 ([P]) parallel polish.

---

## Parallel Example: User Story 4 Test Block

```bash
# After T015 scaffold and US1/US2 impl land, run all addPlayerToClub tests in parallel:
Task: "Add test 'rejects unauthorized' for addPlayerToClub in club.resolver.spec.ts"
Task: "Add test 'throws CLUB_NOT_FOUND when club missing' in club.resolver.spec.ts"
Task: "Add test 'throws PLAYER_NOT_FOUND when player missing' in club.resolver.spec.ts"
Task: "Add test 'creates membership and returns alreadyExisted=false' in club.resolver.spec.ts"
Task: "Add test 'idempotent re-add returns alreadyExisted=true' in club.resolver.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. T001 baseline.
2. T002 error code (foundational).
3. T003–T008 `addPlayerToClub` upgrade.
4. **STOP and VALIDATE**: BAD-120 frontend can now call `addPlayerToClub` and receive a membership ID. Ship.

### Incremental Delivery

1. MVP (above) → ship for BAD-120 unblock.
2. US2 sweep (T009–T014) → consistent error contract across the domain.
3. US4 tests (T015–T028) → Constitution IV compliance.
4. Polish (T029–T034) → regression check + docs.

### Solo Developer Sequence

T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → (T016..T028 in any order) → T029 → T030 → T031 → T032 → T033 → T034.

---

## Notes

- All test cases use mocked `Sequelize` and model statics — never hit the real DB (Constitution IV).
- `findOrCreate` runs **inside** the transaction so concurrent re-submits serialize on the unique constraint `ClubPlayerMemberships_playerId_clubId_unique`.
- Breaking change: `addPlayerToClub` return type. Frontend must update its mutation document. The existing badman-frontend repo's `mutations.gql` likely already targets the new shape (BAD-129 was driven by frontend need); verify in the frontend repo that the document expects an object, not a boolean.
- Commit after each numbered task or logical group (US-level checkpoints recommended).
- T030 note: `nx lint backend-graphql` exits with errors due to pre-existing `@nx/dependency-checks` errors in `package.json` (12 errors, all present before this change). Zero new issues introduced.
- T032 skipped: no i18n changes made, so `i18n.generated.ts` will not change.
- T033 skipped: manual smoke test requires live API access (optional per tasks.md).
