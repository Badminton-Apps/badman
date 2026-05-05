---
description: "Task list for feature 008-reorder-teams-atomic"
---

# Tasks: Atomic Team Reorder (explicit `recalculateTeamNumbersForGroup`)

**Input**: Design documents from `/specs/008-reorder-teams-atomic/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/team-renumber-mutation.md](./contracts/team-renumber-mutation.md), [contracts/team-renumbering-service.md](./contracts/team-renumbering-service.md), [quickstart.md](./quickstart.md)

**Tests**: Tests are mandatory for this feature per Constitution Principle IV (Resolver Test Discipline). Resolver-pattern unit tests are required for every new resolver / service. One real-DB integration test covers the advisory-lock concurrency contract that unit tests cannot exercise.

**Organization**: Tasks are grouped by user story (US1 → US5). MVP scope is US1 + Foundational. US2/US3/US4/US5 are additive and can land in any order after US1.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1, US2, US3, US4, US5)
- All file paths are relative to repo root: `/Users/arno/Documents/Projects/Badman/badman/`

## Path Conventions

Backend Nx monorepo. New / modified code lives under:

- `libs/backend/graphql/src/resolvers/team/` — resolvers, services, GraphQL `@ObjectType`s
- `libs/backend/database/src/` — Sequelize models and shared input types (location of `TeamUpdateInput` confirmed in T002)
- `docs/tech-debt.md` — tech-debt registry update

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: One-time orientation. The monorepo, libs, test runner, and database are already in place from prior work; no project initialization is needed.

- [ ] T001 [P] Verify the local environment is ready: `npm run docker:up` brings up postgres + redis; `nx run-many --target=serve --projects=api,worker-sync --parallel` boots cleanly; `nx test backend-graphql` runs the existing test suite green. Document any local fix in the PR description.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Scaffolding that every subsequent user-story task depends on — the GraphQL `@ObjectType`s, the empty service + resolver shells, and the module wiring. The foundational layer compiles and registers the new GraphQL surface but does not yet implement any algorithm.

**⚠️ CRITICAL**: All user-story phases (Phase 3+) depend on this phase being complete.

- [ ] T002 Locate and document the canonical definition of `TeamUpdateInput`. Grep `libs/backend/database/src/` and `libs/backend/graphql/src/` for `TeamUpdateInput`; confirm where it is declared (likely `libs/backend/database/src/`). Note the path in `specs/008-reorder-teams-atomic/research.md` as an addendum to R7. (No code change yet.)
- [ ] T003 [P] Create the `RecalculateAffectedScope` `@ObjectType` in `libs/backend/graphql/src/resolvers/team/team-renumber-result.object.ts`. Fields: `clubId: ID`, `season: Int`, `types: [SubEventTypeEnum!]!`. Per [contracts/team-renumber-mutation.md](./contracts/team-renumber-mutation.md) "Code-first declaration sketch".
- [ ] T004 [P] Create the `RecalculateTeamNumbersResult` `@ObjectType` in `libs/backend/graphql/src/resolvers/team/team-renumber-result.object.ts` (same file as T003). Fields: `teams: [Team!]!`, `affectedScope: RecalculateAffectedScope!`. Add a class-level `@ObjectType` description matching the contract.
- [ ] T005 Create the empty `TeamRenumberingService` in `libs/backend/graphql/src/resolvers/team/team-renumbering.service.ts`. Inject `Sequelize` + `Logger`. Define `recalculateForScope(args: RecalculateForScopeArgs): Promise<RenumberedTeam[]>` returning `[]` (placeholder). Export the `RecalculateForScopeArgs` and `RenumberedTeam` interfaces from this file with the exact shapes from [contracts/team-renumbering-service.md](./contracts/team-renumbering-service.md) "Public surface".
- [ ] T006 Create the empty `TeamRenumberResolver` in `libs/backend/graphql/src/resolvers/team/team-renumber.resolver.ts`. Inject `Sequelize` + `TeamRenumberingService` + `Logger`. Add the `@Mutation(() => RecalculateTeamNumbersResult)` `recalculateTeamNumbersForGroup` declaration with the exact `@Args` from the contract: `clubId: ID`, `season: Int`, `type: SubEventTypeEnum`, `nationalCountsAsMixed: Boolean = false`. Body: open transaction, look up `Club.findByPk` (throw `CLUB_NOT_FOUND` `GraphQLError` if missing), `user.hasAnyPermission([\`${club.id}_edit:club\`, "edit-any:club"])` (throw `PERMISSION_DENIED` if false), call `service.recalculateForScope({ clubId, season, types: [type], transaction })` (single-type only for now; pooled type derivation lands in US1), commit, return `{ teams: [], affectedScope: { clubId, season, types: [type] } }` (real teams list populated once T015 lands).
- [ ] T007 Update `libs/backend/graphql/src/resolvers/team/team.module.ts`: register `TeamRenumberResolver` and `TeamRenumberingService` as providers alongside the existing `TeamsResolver`. Confirm `nx build backend-graphql` succeeds and the new mutation appears in the introspection schema.

**Checkpoint**: New mutation is queryable (returns a placeholder empty result) and rejects unauthorized callers + unknown clubs. No write paths exercised yet. All user-story phases can now begin.

---

## Phase 3: User Story 1 - Enrollment wizard recalculates the group on demand (Priority: P1) 🎯 MVP

**Goal**: A single explicit call to `recalculateTeamNumbersForGroup` recomputes `teamNumber` / `name` / `abbreviation` for every team in the affected scope (single-type or pooled MX+NATIONAL), based on each team's current `baseIndex`. Strongest team gets `1`, NATIONAL teams take the low slots when pooled.

**Independent Test**: From a club with two same-type teams whose strengths differ (or a club with NATIONAL + MX teams when pooled), call the new mutation and assert: post-state `teamNumber`s match ascending `baseIndex` ordering (with NATIONAL-first tier when pooled), names regenerate cleanly (no `_temp`), no `TEAM_NUMBER_CONFLICT` raised. Reproduces the original bug and proves the fix.

### Implementation for User Story 1

- [ ] T008 [P] [US1] In `libs/backend/graphql/src/resolvers/team/team-renumbering.service.ts`, implement scope-key derivation: a private helper `canonicalScopeKey(types: SubEventTypeEnum[]): string` returning `'M' | 'F' | 'MX' | 'MX+NAT'` per the rules in [contracts/team-renumbering-service.md](./contracts/team-renumbering-service.md) §"Algorithm" step 1. Throw `INTERNAL_ERROR` `GraphQLError` for unsupported shapes (per the same contract).
- [ ] T009 [US1] In the same service file, implement step 2 of the algorithm: as the first DB op of `recalculateForScope`, run `await this._sequelize.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', { bind: ['teams_renumber:' + clubId + ':' + season + ':' + scopeKey], transaction })`. Confirm via local manual test that two parallel calls block on the same key.
- [ ] T010 [US1] In the same service file, implement step 3 of the algorithm: load teams per tier with `Team.findAll({ where: { clubId, season, type: tierType }, include: [{ model: Player, as: 'players', through: { attributes: ['membershipType', 'start', 'end'] } }], transaction, order: [['id', 'ASC']] })`. Iterate `args.types` in order; build `teamsByTier: Team[][]`. Note: `Team.players` is `@BelongsToMany(() => Player, () => TeamPlayerMembership)` per `libs/backend/database/src/models/team.model.ts:154–155`, so each loaded player exposes the join row as `player.TeamPlayerMembership` — that's where `membershipType` lives in step 7.
- [ ] T011 [US1] In the same service file, implement steps 4–6: early-return `[]` if every tier is empty; load `RankingSystem.findOne({ where: { primary: true }, transaction })` (throw `INTERNAL_ERROR` if missing); collect the union of base-member player ids across every tier and run one `RankingLastPlace.findAll({ where: { playerId: { [Op.in]: ids }, systemId: system.id }, transaction })`.
- [ ] T012 [US1] In the same service file, implement step 7: per team, filter `team.players` to base/titular members via `p.TeamPlayerMembership.membershipType === <BASE marker>` (confirm exact enum value via `enrollment.service.ts:210–211` — the same value the validator uses), build `IndexPlayer[]` populated from the rankings batch (`single`/`double`/`mix`/`gender`), and assign `team._baseIndex = getIndexFromPlayers(team.type, indexPlayers, system.amountOfLevels)`. The `_baseIndex` is a transient property on the Sequelize instance, not persisted.
- [ ] T013 [US1] In the same service file, implement step 8: sort each `teamsByTier[i]` in place by `(_baseIndex ASC, id ASC)`.
- [ ] T014 [US1] In the same service file, implement step 9: tiered cumulative slot assignment. Iterate tiers in order, per-tier teams in their sorted order; track `nextSlot` starting at 1; for each team, compare `team.teamNumber` to `nextSlot` — if different, set `team.teamNumber = nextSlot` and `await team.save({ transaction })` (the model's `BeforeUpdate` hook regenerates `name`/`abbreviation`); push `{ team, changed }` into `results`; increment `nextSlot`. Return `results`.
- [ ] T015 [US1] In `libs/backend/graphql/src/resolvers/team/team-renumber.resolver.ts`, replace the placeholder body with the full algorithm: open transaction → `Club.findByPk` → authz → derive scope `types` from `(type, nationalCountsAsMixed)` per [contracts/team-renumber-mutation.md](./contracts/team-renumber-mutation.md) "Behavior (success)" step 4 → `service.recalculateForScope({ clubId, season, types, transaction })` → commit → return `{ teams: results.map(r => r.team), affectedScope: { clubId, season, types } }`. On any thrown error, rollback and re-throw (preserving the existing pattern from `team.resolver.ts`).
- [ ] T016 [P] [US1] Create resolver-pattern unit tests in `libs/backend/graphql/src/resolvers/team/team-renumber.resolver.spec.ts`. Use `Test.createTestingModule` with a fake `Sequelize` (transaction stub returning `{ commit, rollback }`), `jest.spyOn(Club, 'findByPk')`, and a fake `Player` with `hasAnyPermission` jest.fn(). Cases (per Constitution IV): `query-returns-data` (mutation success commits and returns the recalculated teams), `mutation-rejects-unauthorized` (`PERMISSION_DENIED` + rollback), `mutation-handles-not-found` (`CLUB_NOT_FOUND` + rollback), `mutation-rolls-back-on-error` (service throws → rollback + re-throw). Use `afterEach(() => jest.restoreAllMocks())`.
- [ ] T017 [P] [US1] Create service unit tests in `libs/backend/graphql/src/resolvers/team/team-renumbering.service.spec.ts`. Use `Test.createTestingModule`, fake `Sequelize` (with a mocked `query()` for the advisory-lock call), `jest.spyOn` on `Team.findAll`, `RankingSystem.findOne`, `RankingLastPlace.findAll`, and `Team.prototype.save`. Cases (per [research.md](./research.md) R10): single-type already-correct (no writes), single-type wrong order (writes only changed rows), tie on `baseIndex` ordered by `id` asc, missing rankings → `getIndexFromPlayers` default, empty scope → returns `[]`, single team in scope always becomes `1`, pooled MX+NAT NATIONAL takes `1..K` MX takes `K+1..K+M`, pooled where strong MX has lower `baseIndex` than weak NATIONAL — MX still gets the higher number, primary `RankingSystem` missing → `INTERNAL_ERROR`. Use `afterEach(() => jest.restoreAllMocks())`.
- [ ] T018 [US1] Run `nx test backend-graphql --testPathPattern team-renumber`; confirm all unit tests added in T016 + T017 pass. Run `nx lint backend-graphql`; confirm clean. Manually exercise the happy path via the GraphQL playground per [quickstart.md](./quickstart.md) "Happy path — explicit recalculate after a roster edit".

**Checkpoint**: User Story 1 is fully functional. The original bug is closed for any caller that explicitly invokes the new mutation. MVP-deployable.

---

## Phase 4: User Story 2 - Creating or importing a team and then recalculating (Priority: P1)

**Goal**: `createTeam` / `createTeams` continue to work as today (placeholder `MAX(teamNumber)+1` with `nationalCountsAsMixed` pooling intact); they do NOT trigger the recalculate as a side effect. The wizard's "create then recalculate" sequence produces correct final numbering across single-type and bulk-import flows.

**Independent Test**: With three teams already numbered `1`/`2`/`3`, create a fourth team (single or via `createTeams` bulk) with `baseIndex` 80 (should slot at position `2`); call `recalculateTeamNumbersForGroup` for that group; assert the post-state matches `1` (idx 70) / `2` (new team idx 80) / `3` (idx 90) / `4` (idx 110), no `_temp` anywhere.

### Implementation for User Story 2

- [ ] T019 [US2] Confirm `libs/backend/graphql/src/resolvers/team/team.resolver.ts` `createTeam` is unchanged in this work: the `MAX(teamNumber)+1` block at lines ~226–242 stays. Add a one-line comment above the block referencing this spec: `// Placeholder number; authoritative numbers come from recalculateTeamNumbersForGroup. Spec 008.`
- [ ] T020 [US2] Confirm `createTeams` is unchanged: the per-item delegation to `createTeam` stays.
- [ ] T021 [US2] In `libs/backend/graphql/src/resolvers/team/team.resolver.spec.ts`, add a test asserting `createTeam` does NOT invoke `TeamRenumberingService` (use a Jest module mock to spy on the service constructor's `recalculateForScope`; assert it was never called during a `createTeam` flow). Same for `createTeams`. Per the resolver-pattern: mock `Club.findByPk`, `Team.create`, `setClub`, etc.
- [ ] T022 [P] [US2] Add a resolver-spec scenario that walks the create-then-recalculate sequence: mock `createTeam` to return a `TeamResult`, then drive `recalculateTeamNumbersForGroup` for the same scope, assert the recalculate writes the new team's number. Co-located in `team-renumber.resolver.spec.ts` (so the file owning the recalculate also covers its primary trigger sequence).
- [ ] T023 [US2] Manual verification per [quickstart.md](./quickstart.md): in the GraphQL playground, run `createTeam` with `nationalCountsAsMixed: true` for a club that has a NATIONAL team; verify the placeholder number is the post-NATIONAL slot (matches today's behavior); then run `recalculateTeamNumbersForGroup(type: MX, nationalCountsAsMixed: true)` and verify the final numbering matches the federation tier rule.

**Checkpoint**: User Story 2 verified. Existing create paths are untouched in behavior; the wizard's sequence-of-calls produces the right numbering.

---

## Phase 5: User Story 3 - Concurrent recalculate calls never corrupt state (Priority: P1)

**Goal**: Ten concurrent `recalculateTeamNumbersForGroup` calls against the same scope serialize via the postgres advisory lock; all succeed; the persisted state always satisfies the group invariant.

**Independent Test**: Real-DB integration test fires 10 parallel mutations against a seeded club's group (including a pooled MX+NAT scope), asserts contiguous `1..N`, ordering matches ascending `baseIndex`, no duplicates, no `_temp`, zero `TEAM_NUMBER_CONFLICT` raised.

### Implementation for User Story 3

- [ ] T024 [US3] Create `libs/backend/graphql/src/resolvers/team/team-renumbering.integration.spec.ts`. Skeleton: spin up a NestJS test module that wires the real `Sequelize` (pointing at the docker test DB), the real `Team` / `Player` / `RankingLastPlace` / `RankingSystem` models, the real `TeamRenumberingService` and `TeamRenumberResolver`. Bootstrap a clean per-test schema (or use a transaction wrapper that rolls back). Add a top-level `describe.skip` if `process.env.RUN_INTEGRATION_TESTS` is unset, so unit-test runs don't hit the DB.
- [ ] T025 [US3] In the integration spec, add a test "10 parallel calls against the same single-type scope": seed a club with 5 teams of type `M`, varied `baseIndex` (via base-member rosters wired with real `RankingLastPlace` rows for the primary `RankingSystem`); fire 10 parallel `recalculateTeamNumbersForGroup` calls via the resolver (or `Promise.all` over the service); assert post-state is `{1..5}` ordered by ascending `baseIndex`, no `_temp`, zero throws.
- [ ] T026 [US3] In the integration spec, add a test "10 parallel calls against pooled MX+NAT scope": seed a club with 2 NATIONAL teams + 3 MX teams, varied `baseIndex`. Fire 10 parallel calls (some with `(MX, true)`, some with `(NATIONAL, *)` — both should hash to the same lock key). Assert post-state has NATIONAL `1..2` and MX `3..5`, ordered correctly within each tier; no team carries `_temp`.
- [ ] T027 [US3] In the integration spec, add a test "parallel `updateTeam` does not interfere with recalculate": fire one recalculate and several `updateTeam` roster edits at the same teams in parallel; assert the recalculate's post-state is the contiguous `1..N` ordering and that the `updateTeam` calls did NOT write `teamNumber` / `name` / `abbreviation` (the `updateTeam` writes are roster-only). This test depends on US4 having stripped numbering writes from `updateTeam`; sequence US3 after US4 if developing serially, or mark this specific test as `pending` until US4 lands.
- [ ] T028 [US3] Run `RUN_INTEGRATION_TESTS=1 npx jest --config libs/backend/graphql/jest.config.ts --testPathPattern team-renumbering.integration`; confirm all integration tests pass. Document any docker setup gotchas in the PR description.

**Checkpoint**: Concurrency contract proven against a real database. SC-003 (10 concurrent calls leave a valid state) is verified.

---

## Phase 6: User Story 4 - Mid-season edits never change `teamNumber` (Priority: P1)

**Goal**: `updateTeam` is stripped of every write to `teamNumber` / `name` / `abbreviation`. `TeamUpdateInput` no longer accepts `teamNumber`. Mid-season edits leave numbering frozen.

**Independent Test**: After enrollment closes (or at any time outside the wizard), submit a roster edit via `updateTeam` that would, if recalculated, change the strongest team's rank; assert `teamNumber` and `name` of every team in the group are unchanged before AND after the call. Re-assert after a federation ranking sync run.

### Implementation for User Story 4

- [ ] T029 [US4] In the file identified by T002 (likely under `libs/backend/database/src/`), narrow `TeamUpdateInput` to drop the `teamNumber` field. Implementation: redefine via `OmitType(Team, ['teamNumber', ...other-already-omitted])` from `@nestjs/graphql`, OR (if the existing type is hand-written) remove the `@Field(() => Int) teamNumber?: number` line. Verify `nx build backend-graphql` shows no usages of `TeamUpdateInput.teamNumber` anywhere.
- [ ] T030 [US4] In `libs/backend/graphql/src/resolvers/team/team.resolver.ts`, delete the `teamNumber` block from `updateTeam` (lines ~443–504): the `Team.findOne` conflict check that throws `TEAM_NUMBER_CONFLICT`, both `if (updateTeamData.teamNumber > dbTeam.teamNumber)` (down-shift) and `if (updateTeamData.teamNumber < dbTeam.teamNumber)` (up-shift) blocks, the `_temp` suffix assignments, and the trailing `if (changedTeams.length > 0) { … Team.generateName(…) … dbCteam.save({ transaction, hooks: false }) … }` regeneration loop (~lines 538–544). Confirm `dbTeam.update({ ...dbTeam.toJSON(), ...updateTeamData } as Team, { transaction })` no longer produces a `teamNumber` change because the input doesn't carry one.
- [ ] T031 [US4] In `libs/backend/graphql/src/resolvers/team/team.resolver.spec.ts`, update the `updateTeam` test cases to drop any `teamNumber` argument. Add explicit cases: (a) submitting `teamNumber` in the input is a GraphQL validation error (compile-time test sufficient — TS rejects the property; if a runtime test is wanted, use a raw GraphQL string against the schema); (b) `updateTeam` with a roster diff does NOT call `Team.prototype.save` with a `teamNumber` change (assert the pre-save instance and post-save instance have identical `teamNumber`); (c) `updateTeam` does NOT invoke `TeamRenumberingService.recalculateForScope` (mock the service's constructor/method and assert never called).
- [ ] T032 [US4] Verify the model's `BeforeUpdate` hook in `libs/backend/database/src/models/team.model.ts` is unchanged — it still regenerates `name` / `abbreviation` whenever `teamNumber` changes. The recalculate path (US1) relies on this; the `updateTeam` path (US4) no longer triggers it because `teamNumber` is not in the input.
- [ ] T033 [US4] Manual verification per [quickstart.md](./quickstart.md) "Mid-season frozen — `updateTeam` after the wizard does NOT renumber": confirm in the GraphQL playground that an `updateTeam` roster edit leaves `teamNumber` / `name` / `abbreviation` exactly as they were.

**Checkpoint**: User Story 4 verified. The mid-season-frozen invariant holds for every code path that does not explicitly call `recalculateTeamNumbersForGroup`.

---

## Phase 7: User Story 5 - Invalid recalculate calls are rejected cleanly (Priority: P2)

**Goal**: The recalculate mutation rejects unauthorized callers, unknown clubs, and unrecoverable internal errors with stable `extensions.code` values; no partial writes occur on rejection.

**Independent Test**: Invoke the mutation with each invalid input (no permission, unknown club, etc.) and assert: the mutation throws a `GraphQLError` with the expected `extensions.code`, no rows in the affected scope are modified, no advisory lock is held after the call.

### Implementation for User Story 5

- [ ] T034 [US5] In `team-renumber.resolver.spec.ts`, expand the unauthorized + not-found cases (already added in T016) to assert the precise `GraphQLError.extensions.code` values: `PERMISSION_DENIED` for missing `<clubId>_edit:club`/`edit-any:club`, `CLUB_NOT_FOUND` for an unknown `clubId`. Assert the transaction rollback was called for each.
- [ ] T035 [US5] In `team-renumber.resolver.spec.ts`, add a case for `INTERNAL_ERROR`: simulate `TeamRenumberingService.recalculateForScope` throwing a non-classified `Error`. Assert the resolver wraps it as `GraphQLError` with `extensions.code = INTERNAL_ERROR` (preserving the convention from `createTeam` in `team.resolver.ts`). Assert rollback called.
- [ ] T036 [US5] In `team-renumbering.service.spec.ts`, add a case "primary `RankingSystem` missing" that asserts the service throws `GraphQLError` with `extensions.code = INTERNAL_ERROR` and that no `Team.prototype.save` calls were made.
- [ ] T037 [US5] Optional integration assertion (extend the integration spec from T024): after a rejected recalculate (e.g. unauthorized caller), query `Teams` for the scope and assert the rows are byte-identical to the pre-call snapshot.

**Checkpoint**: User Story 5 verified. Error contract is stable and observable; constitution principle IV's rollback case is covered for the new resolver.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Tech-debt cleanup, documentation sync, and final formatter / lint pass.

- [ ] T038 [P] Delete the obsolete tech-debt entry "Team: `teamNumber` auto-increment race on `createTeam`" from `docs/tech-debt.md` (currently around line 104). In the deletion commit message, document why: the recalculate is the source of truth for team numbers, so a duplicate placeholder produced by parallel `createTeam` calls is no longer a numbering risk.
- [ ] T039 [P] Update the leading "Pillar Risks" line in `docs/tech-debt.md` (around line 7) that references "narrow concurrent-write window — pre-existing `teamNumber`": remove the `teamNumber` portion (other risks on that line stay).
- [ ] T040 [P] Confirm `libs/backend/graphql/src/utils/error-codes.ts` retains the `TEAM_NUMBER_CONFLICT` constant (kept for one release per [research.md](./research.md) R8). Add a `// Deprecated: no longer raised by any resolver as of spec 008. Remove once active frontend's error map drops the case.` comment above the line.
- [ ] T041 Run `prettier --check .` repo-wide; fix any formatting drift introduced by the changes. Run `nx affected:test` and `nx affected:lint` to catch any cross-lib regressions.
- [ ] T042 Walk through [quickstart.md](./quickstart.md) end-to-end against a fresh local DB to confirm every scenario behaves as documented (pre-fix bug repro, contract delta, happy path single-type, happy path pooled MX+NAT, concurrent path, mid-season frozen, local `_temp` self-heal). Note any deviation in the PR description.
- [ ] T043 Update `AGENTS.md` if the SPECKIT plan reference still points at this branch's plan after merge prep. Sync the symlinked `CLAUDE.md` reading is automatic — never edit the symlink.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: `T001` only. No code changes; establishes a working dev environment.
- **Foundational (Phase 2)**: `T002–T007`. Must complete before ANY user-story phase begins. New mutation surface exists but does nothing yet.
- **User Story 1 (Phase 3)**: `T008–T018`. Depends on Foundational. **Delivers MVP** — closes the original bug for any caller that uses the new mutation.
- **User Story 2 (Phase 4)**: `T019–T023`. Depends on Foundational + US1 (the recalculate mutation must exist and work for US2's create-then-recalculate sequence).
- **User Story 3 (Phase 5)**: `T024–T028`. Depends on Foundational + US1. `T027` additionally depends on US4 (mark `pending` if US4 hasn't landed).
- **User Story 4 (Phase 6)**: `T029–T033`. Depends only on Foundational; can run in parallel with US1/US2/US3 work because it only modifies `team.resolver.ts` `updateTeam` and `TeamUpdateInput`. Does NOT depend on the recalculate being implemented.
- **User Story 5 (Phase 7)**: `T034–T037`. Depends on US1 (resolver structure) and US3's integration spec (for T037).
- **Polish (Phase 8)**: `T038–T043`. Depends on every preceding phase landing on the branch.

### User Story Dependencies

- US1 has no dependencies on other stories. Can be developed solo.
- US2 depends on US1 (recalculate must exist for the sequence test).
- US3 depends on US1 (mutation must exist) and US4 (T027 only).
- US4 depends only on Foundational; independent of US1/US2/US3.
- US5 depends on US1 (resolver structure) and partially on US3 (T037).

### Within Each User Story

- Tests are co-located with the code they exercise; resolver-pattern tests follow the constitution.
- Models / `@ObjectType` declarations land before service methods that consume them (Foundational).
- Service algorithm steps land in the order T008 → T009 → T010 → T011 → T012 → T013 → T014; later steps depend on earlier ones (same file).
- Resolver wiring (T015) depends on the service being functional (T008–T014 done).
- Unit tests (T016, T017) can be drafted in parallel with the implementation but verified after.
- Integration test (T024–T028) runs against the real DB; landed last in the P1 set.

### Parallel Opportunities

- **Within Foundational**: T003 + T004 are the same file but independent edits — sequence them; T005 + T006 are different files — parallel; T007 depends on T005 + T006.
- **Within US1**: T016 + T017 are different test files — parallel. The service-algorithm tasks T008–T014 are all in `team-renumbering.service.ts` — sequence them.
- **Within US2**: T019 + T020 are independent verifications (different code blocks) — parallel; T022 lands in a different test file from T021 — parallel.
- **Within US3**: integration-test scenarios (T025, T026, T027) are independent test cases — parallel within the same file.
- **Across stories** (post-Foundational): US1 and US4 are independent (different files / blocks) — a second developer can work US4 while US1 lands.
- **Polish**: T038 / T039 / T040 are independent edits — parallel.

---

## Parallel Example: User Story 1 fast-track

```bash
# After T015 commits the resolver wiring, two test files can be drafted in parallel:
Task T016: "Create resolver-pattern unit tests in libs/backend/graphql/src/resolvers/team/team-renumber.resolver.spec.ts"
Task T017: "Create service unit tests in libs/backend/graphql/src/resolvers/team/team-renumbering.service.spec.ts"
```

## Parallel Example: Foundational fast-track

```bash
# T005 (service skeleton) and T006 (resolver skeleton) live in different files:
Task T005: "Create the empty TeamRenumberingService in libs/backend/graphql/src/resolvers/team/team-renumbering.service.ts"
Task T006: "Create the empty TeamRenumberResolver in libs/backend/graphql/src/resolvers/team/team-renumber.resolver.ts"
# T007 (module wiring) depends on both above and runs after.
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational (T002–T007).
3. Complete Phase 3: User Story 1 (T008–T018).
4. **STOP and VALIDATE**: run [quickstart.md](./quickstart.md) "Happy path — explicit recalculate after a roster edit" and "Happy path — pooled MX + NATIONAL". Confirm the original bug is closed end-to-end.
5. Deploy/demo if ready. The MVP unblocks the active frontend's adoption of the new mutation; US2/US3/US4/US5 can land in subsequent PRs without holding up the FE migration.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. Add US1 → manual quickstart pass → deploy/demo (MVP — original bug closed).
3. Add US4 → mid-season-frozen invariant verified via test + manual quickstart → deploy.
4. Add US2 → create-then-recalculate sequence verified → deploy.
5. Add US3 → integration concurrency proven → deploy.
6. Add US5 → error contract polished → deploy.
7. Polish → tech-debt + docs cleaned → final deploy.

Each step adds verifiable value without breaking previous stories.

### Parallel Team Strategy

With two developers:

1. Both complete Setup + Foundational together.
2. Once Foundational lands:
   - Developer A: US1 then US2 then US5 (the recalculate-side work).
   - Developer B: US4 (the strip-existing-mutations work) — fully independent file edits.
3. After both above land, either developer picks up US3 (integration test depends on both halves).
4. Polish at the end.

---

## Notes

- `[P]` tasks operate on different files and have no dependency on incomplete tasks.
- `[Story]` label maps each task to the user story it serves.
- Every new resolver / service follows the resolver-pattern from `libs/backend/graphql/src/resolvers/enrollmentSetting/enrollmentSetting.resolver.spec.ts` (constitution principle IV).
- Commit after each task or logical group; the auto-commit hook (`/speckit-git-commit`) handles this if invoked.
- Stop at any checkpoint to validate independently.
- Avoid: vague tasks, same-file conflicts in parallel work, cross-story dependencies that break independence.
