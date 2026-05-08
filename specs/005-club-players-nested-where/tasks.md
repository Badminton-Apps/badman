---

description: "Tasks for Filter Club Players by Membership Fields (BAD-132)"
---

# Tasks: Filter Club Players by Membership Fields

**Input**: Design documents from `/specs/005-club-players-nested-where/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: Required per Constitution Principle IV. Test tasks included.

**Organization**: Resolver impl is one cohesive change (Foundational); user-story phases own their test cases.

## Format: `[ID] [P?] [Story?] Description with file path`

## Path Conventions

NestJS Nx monorepo. Affected paths:
- `libs/backend/graphql/src/resolvers/club/` — input type, resolver, tests

---

## Phase 1: Setup

- [ ] T001 Run baseline `nx test backend-graphql` and capture pass count, so any new failure introduced later is attributable

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the new input type and the full resolver change in one cohesive unit. All user stories depend on this.

**⚠️ CRITICAL**: T002 + T003 must complete before any test task in Phases 3–6 can run.

- [ ] T002 Create `ClubMembershipFilterInput` `@InputType` in `libs/backend/graphql/src/resolvers/club/club-membership-filter.input.ts` with fields `id: [ID!]`, `membershipType: [String!]`, `startBefore: Date`, `endAfter: Date`, `confirmed: Boolean` per data-model.md "New GraphQL input type"; field-level descriptions explain the operator semantics (`startBefore` → `<=`, `endAfter` → `>=`, arrays → `IN`, `endAfter` excludes NULL `end`)

- [ ] T003 Extend the `Club.players` resolver in `libs/backend/graphql/src/resolvers/club/club.resolver.ts:92-147` per plan.md Step 2:
  - Add `@Args("clubMembership", { type: () => ClubMembershipFilterInput, nullable: true }) clubMembership?: ClubMembershipFilterInput` parameter
  - Compute `const optingIn = clubMembership !== undefined && clubMembership !== null`
  - Short-circuit `return []` when `clubMembership.id !== undefined && clubMembership.id.length === 0`
  - Build `membershipWhere` from set fields (`id` → `Op.in`, `membershipType` → `Op.in`, `startBefore` → `start: { Op.lte }`, `endAfter` → `end: { Op.gte }`, `confirmed` → exact)
  - Append `{ model: ClubPlayerMembership, as: "ClubPlayerMembership", required: anyFieldSet, where: anyFieldSet ? membershipWhere : undefined }` to `options.include`
  - Wrap the existing `active`-derived `confirmed=true` injection: `if (active && !optingIn) { options.where = { ...options.where, [`$${ClubPlayerMembership.name}.confirmed$`]: true }; }`
  - Add imports: `ClubMembershipFilterInput`, `Op` from `sequelize`

**Checkpoint**: Resolver compiles. Schema introspection shows the new arg. All four user stories are now mechanically implemented; remaining tasks verify per-story behavior via tests.

---

## Phase 3: User Story 1 — LOAN memberships for an enrollment season (Priority: P1) 🎯 MVP

**Goal**: Frontend loads LOAN memberships overlapping a season window, **including unconfirmed**.

**Independent Test**: `players(clubMembership: { membershipType: ["LOAN"], startBefore, endAfter })` returns the expected rows including unconfirmed; query log shows one INNER JOIN.

### Tests for User Story 1

- [ ] T004 [P] [US1] Add test "LOAN + season window returns matching memberships including unconfirmed" in `libs/backend/graphql/src/resolvers/club/club.resolver.spec.ts` — spy `Club.findByPk` returning a fake club with `getPlayers` jest.fn(); call resolver with `clubMembership: { membershipType: ["LOAN"], startBefore: new Date("2026-04-30"), endAfter: new Date("2025-09-01") }`; assert `getPlayers` called with `include` containing one entry where `model === ClubPlayerMembership`, `required === true`, `where.membershipType: { [Op.in]: ["LOAN"] }`, `where.start: { [Op.lte]: ... }`, `where.end: { [Op.gte]: ... }`; assert no `$ClubPlayerMembership.confirmed$ = true` key in `options.where` (legacy filter suppressed)

- [ ] T005 [P] [US1] Add test "empty result is not an error" — same input as T004 but `getPlayers` resolves `[]`; assert resolver returns `[]` without throwing

- [ ] T006 [P] [US1] Add test "membership filter composes with player-level where (logical AND)" — call with both `where: { firstName: { $eq: "Anna" } }` (post-`queryFixer`) AND `clubMembership: { membershipType: ["LOAN"] }`; assert `options.where` contains the player-level filter AND `options.include[].where.membershipType` contains the LOAN filter

**Checkpoint**: US1 acceptance scenarios verified.

---

## Phase 4: User Story 2 — Unconfirmed NORMAL (transfer) memberships for an enrollment season (Priority: P1)

**Goal**: Frontend loads unconfirmed NORMAL memberships (transfers) for a season window using `confirmed: false` + date range.

**Independent Test**: `players(clubMembership: { membershipType: ["NORMAL"], confirmed: false, startBefore, endAfter })` returns only unconfirmed NORMAL memberships overlapping the season.

### Tests for User Story 2

- [ ] T007 [P] [US2] Add test "NORMAL + confirmed:false + season window returns unconfirmed transfer memberships" in `libs/backend/graphql/src/resolvers/club/club.resolver.spec.ts` — call with `clubMembership: { membershipType: ["NORMAL"], confirmed: false, startBefore: new Date("2026-04-30"), endAfter: new Date("2025-09-01") }`; assert `options.include[].where.membershipType: { [Op.in]: ["NORMAL"] }`, `where.confirmed === false`, `where.start: { [Op.lte]: ... }`, `where.end: { [Op.gte]: ... }`, `required === true`; legacy `$confirmed$=true` not present in `options.where`

- [ ] T008 [P] [US2] Add test "confirmed:false does not return confirmed members" — same call as T007; `getPlayers` resolves `[fakeConfirmedPlayer]`; assert resolver returns that list (no filtering on resolver side — SQL handles it); assert `options.include[].where.confirmed === false` (not undefined)

- [ ] T009 [P] [US2] Add test "empty result when no transfers exist is not an error" — same input as T007, `getPlayers` resolves `[]`; assert resolver returns `[]` without throwing

**Checkpoint**: US2 acceptance scenarios verified.

---

## Phase 5: User Story 3 — Existing callers stay unchanged (Priority: P1)

**Goal**: Callers that DO NOT pass `clubMembership` continue to receive only confirmed memberships, exactly as today.

**Independent Test**: `players(where: { firstName: { $eq: "Anna" } })` (no `clubMembership`) → identical behavior to before this PR.

### Tests for User Story 3

- [ ] T010 [P] [US3] Add test "omitted clubMembership preserves legacy confirmed=true filter" — call with `where: { firstName: { $eq: "Anna" } }` and NO `clubMembership` arg, `active=true` (default); assert `options.where[$ClubPlayerMembership.confirmed$] === true`; assert `options.include` does NOT contain a `ClubPlayerMembership` model entry from this fix (the legacy code path adds the dollar-syntax filter, not an explicit include)

- [ ] T011 [P] [US3] Add test "clubMembership: {} opts in (LEFT JOIN, no implicit confirmed)" — call with `clubMembership: {}`; assert `options.include` contains a `ClubPlayerMembership` entry with `required: false`; assert `options.where` does NOT contain `$ClubPlayerMembership.confirmed$`

- [ ] T012 [P] [US3] Add test "explicit confirmed: false returns only unconfirmed" — call with `clubMembership: { confirmed: false }`; assert `options.include[].where.confirmed === false` and `options.include[].required === true`

- [ ] T013 [P] [US3] Add test "active=false with no clubMembership skips legacy injection" — call with `where: {}`, `active: false`, no `clubMembership`; assert no `$ClubPlayerMembership.confirmed$` key (regression guard for the legacy `active=false` branch)

**Checkpoint**: US3 acceptance scenarios verified. SC-003 (zero regressions on omitted-arg callers) green.

---

## Phase 6: User Story 4 — Single SQL query per call (Priority: P2)

**Goal**: One SQL query per resolver call regardless of result size.

**Independent Test**: Spy on `Sequelize.prototype.query` (or the underlying find); assert exactly one call.

### Tests for User Story 4

- [ ] T014 [P] [US4] Add test "single-query: getPlayers called once" — call with `clubMembership: { membershipType: ["LOAN"] }` against a fake club whose `getPlayers` resolves a 50-row array; assert `fakeClub.getPlayers` called exactly once. (Note: this verifies the resolver-level call shape; full SQL-query-count assertion across the Sequelize layer is verified manually in T017 polish.)

**Checkpoint**: US4 acceptance scenarios verified at the resolver level.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T015 Run `nx test backend-graphql` — all suites must pass (existing + new)

- [ ] T016 Run `nx lint backend-graphql` — must pass (no new lint errors)

- [ ] T017 Run `nx build backend-graphql` and `nx build api` — both must compile clean (catches missing input-type registration)

- [ ] T018 [P] Manual smoke (SC-005 verification): with API running on :5010, against the probe target club `4699bcdd-f6db-48ea-81aa-f79acdf47a7c` per BAD-132 references, run two queries:
  1. `Club.players` with no `clubMembership` arg — note the player count
  2. `Club.players(clubMembership: {})` — assert count is ≥ first count + 4 (the four known unconfirmed NORMAL memberships)

- [ ] T019 [P] Manual smoke (LOAN season filter): with API running, query `Club.players(clubMembership: { membershipType: ["LOAN"], startBefore: <2026-04-30 ISO>, endAfter: <2025-09-01 ISO> })` against a club with known LOAN memberships in 2025-26; verify only LOAN rows return and the SQL log shows one query with one INNER JOIN

- [ ] T020 [P] Manual smoke (transfer filter): with API running, query `Club.players(clubMembership: { membershipType: ["NORMAL"], confirmed: false, startBefore: <2026-04-30 ISO>, endAfter: <2025-09-01 ISO> })` against the probe club; verify only unconfirmed NORMAL rows return (SC-002 verification)

- [ ] T021 [P] Verify schema introspection: with API running, run `query { __type(name: "ClubMembershipFilterInput") { name fields { name type { name kind ofType { name } } } } }`; assert all five fields are present with the expected types

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: T001 — independent.
- **Phase 2 (Foundational)**: T002 must complete before T003 (resolver imports the input type). After T003, all four user stories are mechanically implemented.
- **Phases 3–6 (Test phases)**: All depend on Phase 2 complete. Test files in different test cases parallelize freely.
- **Phase 7 (Polish)**: T015–T017 sequential; T018–T021 parallel after the API boots.

### User Story Independence

- **US1, US2, US3, US4**: All four are verified by tests against the same resolver. Test cases are independent and can be authored/run in any order. Implementation work for all four lives entirely in T002+T003 (Foundational).

### Parallel Opportunities

- T004–T006 ([P] [US1]) — three test cases, separate `it()` blocks, can land in any order.
- T007–T009 ([P] [US2]) — same.
- T010–T013 ([P] [US3]) — four test cases, parallel.
- T014 ([P] [US4]) — single test.
- T018–T021 ([P]) — four independent manual smoke checks.

### Within Each User Story

- Tests are pure unit tests; no ordering between them.
- All assert against the `options` shape passed to `fakeClub.getPlayers` (`include`, `where`, `required`, `Op.in`/`Op.lte`/`Op.gte`). The Sequelize Symbol keys (`Op.in`, etc.) are imported in the test file.

---

## Parallel Example: US1 Tests

```bash
# After T003 lands, run these in parallel:
Task: "Add test 'LOAN + season window returns matching memberships including unconfirmed' in club.resolver.spec.ts"
Task: "Add test 'empty result is not an error' in club.resolver.spec.ts"
Task: "Add test 'membership filter composes with player-level where' in club.resolver.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. T001 baseline.
2. T002 input type.
3. T003 resolver extension.
4. T004–T006 US1 tests pass.
5. **STOP and VALIDATE**: BAD-120 frontend can call `Club.players(clubMembership: { membershipType: ["LOAN"], startBefore, endAfter })` and receive unconfirmed LOANs. Ship.

### Incremental Delivery

1. MVP (above) ships → BAD-120's loan-loading unblocked.
2. T007–T009 (US2) → transfer-loading with `confirmed: false` + date range works.
3. T010–T013 (US3) → regression coverage for autocomplete + other legacy callers locks the contract.
4. T014 (US4) → perf assertion at resolver level.
5. T015–T021 (Polish) → full test suite green + manual smoke + introspection check.

### Solo Developer Sequence

T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020 → T021.

---

## Notes

- All resolver tests use mocked `Club.findByPk` (returning a fake `Club` with a `getPlayers` jest.fn) — never hit the real DB. Constitution IV.
- Assertions check the *shape* of `options` passed to `getPlayers` (`include`, `where`, `required`, `Op.in`/`Op.lte`/`Op.gte`). The Sequelize Symbol keys (`Op.in`, etc.) are imported in the test file.
- Manual smokes in Polish (T018–T021) need the local API running and a club seeded with the right mix of confirmed/unconfirmed memberships. The probe club ID from BAD-132 references is a known-good target.
- Frontend coordination (BAD-120 `.gql` updates + codegen regen) is OUT OF SCOPE for this branch; that's a sibling PR in the frontend repo.
